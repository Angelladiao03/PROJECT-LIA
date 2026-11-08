<?php
// Staff: requests to turn guest accounts into permanent student accounts.
//
// GET                    -> pending requests (oldest first) + the 20 most recent decisions
// GET ?photo=REQUEST_ID  -> the ID photo (only while the request is pending)
// POST action=approve requestId
// POST action=decline requestId, reason
//
// The ID photo is deleted as soon as the request is approved or declined.
// Counselor: every request. Advocate: requests from students of their grade level.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin('counselor', 'advocate');
$grade = staff_grade($admin); // null = all grade levels
$inScope = 'CAST(? AS INT) IS NULL OR r.grade_level = CAST(? AS INT)';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['photo'])) {
    $id = positive_int((string) $_GET['photo']);
    $stmt = db()->prepare("SELECT id_photo, id_photo_type FROM activation_requests r WHERE request_id = ? AND status = 'Pending' AND ($inScope)");
    $stmt->execute([$id ?? 0, $grade, $grade]);
    $row = $stmt->fetch();
    if (!$row || $row['id_photo'] === null) {
        http_response_code(404);
        exit;
    }
    $bytes = is_resource($row['id_photo']) ? stream_get_contents($row['id_photo']) : $row['id_photo'];
    header('Content-Type: ' . $row['id_photo_type']);
    header('Cache-Control: no-store');               // never saved in the browser
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: inline; filename="id-photo"');
    echo $bytes;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $map = fn ($r) => [
        'requestId' => (int) $r['request_id'],
        'userId' => (int) $r['user_id'],
        'guestId' => $r['guest_id'],
        'email' => $r['email'],
        'fullName' => $r['full_name'],
        'username' => $r['username'],
        'gradeSection' => $r['grade_section'],
        'gradeLevel' => $r['grade_level'] !== null ? (int) $r['grade_level'] : null,
        'adviser' => $r['adviser_name'],
        'contactNumber' => $r['contact_number'],
        'status' => $r['status'],
        'declineReason' => $r['decline_reason'],
        'submittedAt' => $r['submitted_at'],
        'reviewedAt' => $r['reviewed_at'],
        'reviewedBy' => $r['reviewer'],
        'hasPhoto' => (bool) $r['has_photo'],
    ];
    $select = 'SELECT r.request_id, r.user_id, r.full_name, r.username, r.grade_section, r.grade_level, r.adviser_name,
                      r.contact_number, r.status, r.decline_reason, r.submitted_at, r.reviewed_at,
                      (r.id_photo IS NOT NULL) AS has_photo, u.guest_id, u.email, a.admin_fullname AS reviewer
               FROM activation_requests r
               JOIN users u ON u.user_id = r.user_id
               LEFT JOIN admin_profile a ON a.admin_id = r.reviewed_by ';
    $pending = db()->prepare($select . "WHERE r.status = 'Pending' AND ($inScope) ORDER BY r.submitted_at ASC");
    $pending->execute([$grade, $grade]);
    $recent = db()->prepare($select . "WHERE r.status <> 'Pending' AND ($inScope) ORDER BY r.reviewed_at DESC LIMIT 20");
    $recent->execute([$grade, $grade]);
    $pending = $pending->fetchAll();
    $recent = $recent->fetchAll();
    send_json(['success' => true, 'pending' => array_map($map, $pending), 'recent' => array_map($map, $recent)]);
}

// ----- POST: approve or decline -----
$action = input('action');
$requestId = positive_int(input('requestId'));
if ($requestId === null) json_error('Missing request number.');
if (!in_array($action, ['approve', 'decline'], true)) json_error('Unknown action.');

$reason = input('reason');
if ($action === 'decline') {
    if (mb_strlen($reason) < 5) json_error('Write the reason. The student will receive it by email.');
    if (too_long($reason, 1000)) json_error('Keep the reason under 1,000 characters.');
}

$pdo = db();
$pdo->beginTransaction();

$stmt = $pdo->prepare(
    "SELECT r.*, u.email, u.account_type FROM activation_requests r JOIN users u ON u.user_id = r.user_id
     WHERE r.request_id = ? AND r.status = 'Pending' AND ($inScope) FOR UPDATE OF r"
);
$stmt->execute([$requestId, $grade, $grade]);
$request = $stmt->fetch();
if (!$request) {
    $pdo->rollBack();
    json_error('This request was already reviewed. Reload the page.', 409);
}

if ($action === 'approve') {
    $stmt = $pdo->prepare('SELECT 1 FROM users WHERE LOWER(username) = LOWER(?) AND user_id <> ?');
    $stmt->execute([$request['username'], $request['user_id']]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        json_error('Another account now uses this username. Decline and ask the student to choose another.', 409);
    }
    $pdo->prepare(
        "UPDATE users SET account_type = 'student', username = ?, full_name = ?, grade_section = ?, grade_level = ?,
                section = ?, adviser_name = ?, contact_number = ?, expires_at = NULL, status = 'Active'
         WHERE user_id = ?"
    )->execute([$request['username'], $request['full_name'], $request['grade_section'], $request['grade_level'],
                $request['section'], $request['adviser_name'], $request['contact_number'], $request['user_id']]);
}

// Record the decision and delete the ID photo.
$pdo->prepare(
    'UPDATE activation_requests
     SET status = ?, decline_reason = ?, reviewed_at = NOW(), reviewed_by = ?, id_photo = NULL, id_photo_type = NULL
     WHERE request_id = ?'
)->execute([$action === 'approve' ? 'Approved' : 'Declined', $action === 'decline' ? $reason : null,
            $admin['admin_id'], $requestId]);
$pdo->commit();
audit((int) $admin['admin_id'], 'account.' . $action, 'activation', $requestId,
      ($action === 'decline' ? "Reason: $reason. " : '') . 'Student: ' . $request['full_name']);

// Tell the student by email.
$name = $request['full_name'];
if ($action === 'approve') {
    $sent = send_email(
        $request['email'],
        '[LagroInAction] Student Account Request Approved',
        [
            'greeting' => "Dear $name,",
            'lines' => ['The Guidance Office has approved your request. Your LagroInAction account is now a permanent student account. Your username is:'],
            'code' => $request['username'],
            'after' => [
                'Please sign in on the Student tab using this username or this email address, with your current password. Your guest ID is no longer needed.',
                'In accordance with the Data Privacy Act of 2012 (RA 10173), the photo of your school ID has been deleted from the system.',
            ],
        ]
    );
} else {
    $sent = send_email(
        $request['email'],
        '[LagroInAction] Student Account Request Not Approved',
        [
            'greeting' => "Dear $name,",
            'lines' => ['The Guidance Office was unable to approve your request for a permanent student account for the following reason:'],
            'note' => $reason,
            'after' => [
                'You may continue to use your guest account, and you may submit a new request once the concern above has been addressed.',
                'In accordance with the Data Privacy Act of 2012 (RA 10173), the photo of your school ID has been deleted from the system.',
            ],
        ]
    );
}

$done = $action === 'approve' ? 'Approved.' : 'Declined.';
json_success($sent ? "$done The student was emailed." : "$done (The email could not be sent - the student will see the result when they sign in.)");
