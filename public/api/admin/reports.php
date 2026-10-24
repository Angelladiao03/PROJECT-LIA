<?php
// Staff: incident reports.
//
// GET -> every report (newest first). The page filters by status.
//        Anonymous reports never include who sent them.
//
// POST action=approve     reportNo   Pending -> Active
// POST action=investigate reportNo   Active -> Under Investigation
// POST action=resolve     reportNo   -> Resolved
// POST action=reject      reportNo, reason   -> Rejected (the student sees the reason)
// POST action=archive     reportNo   hides a Resolved/Rejected report from Records (never deleted)
// POST action=unarchive   reportNo
// GET  ?history=N            who did what to report N, and when (audit log)
//
// Every change is written to the audit log with the staff member's name.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin();

// GET ?history=N -> the case history of one report (from the audit log)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['history'])) {
    $reportNo = positive_int($_GET['history']);
    if ($reportNo === null) json_error('Missing report number.');
    $stmt = db()->prepare(
        "SELECT l.action, l.details, l.created_at, a.admin_fullname
         FROM audit_log l LEFT JOIN admin_profile a ON a.admin_id = l.admin_id
         WHERE l.target_type = 'report' AND l.target_id = ? ORDER BY l.created_at, l.log_id"
    );
    $stmt->execute([$reportNo]);
    send_json(['success' => true, 'history' => array_map(fn ($h) => [
        'what' => audit_label($h['action']),
        'details' => $h['details'],
        'by' => $h['admin_fullname'] ?? 'Unknown staff',
        'at' => $h['created_at'],
    ], $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = db()->query(
        'SELECT r.*, u.account_type, u.guest_id, u.full_name, u.username, u.grade_section,
                u.adviser_name, u.contact_number, u.email
         FROM reports r LEFT JOIN users u ON u.user_id = r.user_id
         ORDER BY r.report_datetime DESC'
    )->fetchAll();

    $reports = array_map(function ($r) {
        $anonymous = (bool) $r['is_anonymous'];
        $canMessage = !$anonymous && $r['user_id'] !== null;
        return [
            'reportNo' => (int) $r['report_no'],
            'anonymous' => $anonymous,
            'reporter' => $anonymous ? null : [
                'userId' => $r['user_id'] !== null ? (int) $r['user_id'] : null,
                'name' => $r['user_id'] !== null ? display_name($r) : 'Unknown (old record)',
                'accountType' => $r['account_type'],
                'username' => $r['username'],
                'gradeSection' => $r['grade_section'],
                'adviser' => $r['adviser_name'],
                'contactNumber' => $r['contact_number'],
                'email' => $r['account_type'] === 'student' ? $r['email'] : null,
            ],
            'canMessage' => $canMessage,
            'reporterRole' => $r['reporter_role'],
            'category' => $r['category'],
            'location' => $r['report_location'],
            'incidentDate' => $r['incident_date'],
            'description' => $r['report_description'],
            'involvedKnown' => (bool) $r['involved_person_known'],
            'involvedDescription' => $r['involved_person_description'],
            'status' => $r['report_status'],
            'rejectReason' => $r['reject_reason'],
            'archived' => $r['archived_at'] !== null,
            'submittedAt' => $r['report_datetime'],
            'updatedAt' => $r['updated_at'],
        ];
    }, $rows);

    send_json(['success' => true, 'reports' => $reports]);
}

// ----- POST: change a report -----
$action = input('action');
$reportNo = positive_int(input('reportNo'));
if ($reportNo === null) json_error('Missing report number.');

$stmt = db()->prepare('SELECT report_status, archived_at FROM reports WHERE report_no = ?');
$stmt->execute([$reportNo]);
$report = $stmt->fetch();
if (!$report) json_error('That report no longer exists.', 404);
$status = $report['report_status'];

// Which status each action needs first, and what it changes to.
$moves = [
    'approve' => [['Pending'], 'Active', 'Report approved and moved to Active.'],
    'investigate' => [['Active'], 'Under Investigation', 'Report moved to Under Investigation.'],
    'resolve' => [['Active', 'Under Investigation'], 'Resolved', 'Report marked as Resolved.'],
    'reject' => [['Pending', 'Active'], 'Rejected', 'Report rejected. The student can see your reason.'],
];

if (isset($moves[$action])) {
    [$from, $to, $message] = $moves[$action];
    if (!in_array($status, $from, true)) {
        json_error("This report is already \"$status\", so it can't be changed that way. Reload the page.", 409);
    }
    $reason = null;
    if ($action === 'reject') {
        $reason = input('reason');
        if (mb_strlen($reason) < 5) json_error('Write a short reason the student will see.');
        if (too_long($reason, 1000)) json_error('Keep the reason under 1,000 characters.');
    }
    db()->prepare('UPDATE reports SET report_status = ?, reject_reason = ?, updated_at = NOW() WHERE report_no = ?')
        ->execute([$to, $reason, $reportNo]);
    audit((int) $admin['admin_id'], 'report.' . $action, 'report', $reportNo, $reason ?? '');
    json_success($message);
}

if ($action === 'archive' || $action === 'unarchive') {
    if (!in_array($status, ['Resolved', 'Rejected'], true)) {
        json_error('Only Resolved or Rejected reports can be archived.', 409);
    }
    db()->prepare('UPDATE reports SET archived_at = ' . ($action === 'archive' ? 'NOW()' : 'NULL') . ', updated_at = NOW() WHERE report_no = ?')
        ->execute([$reportNo]);
    audit((int) $admin['admin_id'], 'report.' . $action, 'report', $reportNo);
    json_success($action === 'archive' ? 'Report archived. It is kept, just hidden from the main list.' : 'Report restored.');
}

json_error('Unknown action.');
