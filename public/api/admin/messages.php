<?php
// Staff: conversations with students and guests.
//
// GET                -> list of conversations (newest message first)
// GET ?userId=12     -> one conversation + who it's with
// POST userId, text  -> send a message to that person
// POST userId, reportNo, text(optional) -> send a report case card for follow-up.
// POST userId, file, text(optional)     -> send a file (PDF, Word, JPG, PNG; up to 5 MB), e.g. a form to fill up
//      Only reports with the student's name shown can be attached (never anonymous ones).

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin();

function person(int $userId): array
{
    $user = find_user($userId);
    if ($user === null) json_error('That account was not found.', 404);
    return [
        'userId' => (int) $user['user_id'],
        'name' => display_name($user),
        'accountType' => $user['account_type'],
        'status' => $user['status'],
        // Guests stay anonymous: staff only see their guest ID.
        'gradeSection' => $user['account_type'] === 'student' ? $user['grade_section'] : null,
        'adviser' => $user['account_type'] === 'student' ? $user['adviser_name'] : null,
        'contactNumber' => $user['contact_number'], // guests too, so staff can reach them
        'email' => $user['account_type'] === 'student' ? $user['email'] : null,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = positive_int(input('userId'));
    $text = input('text');
    $reportNo = input('reportNo') === '' ? null : positive_int(input('reportNo'));
    if ($userId === null) json_error('Choose a conversation first.');
    if (input('reportNo') !== '' && $reportNo === null) json_error('Choose a report to attach.');
    person($userId); // checks the account exists

    if ($reportNo !== null) {
        // The case must belong to this student and must NOT be anonymous
        $stmt = db()->prepare('SELECT report_no FROM reports WHERE report_no = ? AND user_id = ? AND is_anonymous = FALSE');
        $stmt->execute([$reportNo, $userId]);
        if (!$stmt->fetch()) json_error('That report can\'t be attached to this conversation.', 403);
        if ($text === '') $text = "Follow-up on your report #$reportNo.";
    }
    $file = read_attachment(); // optional: a form or other file (multipart field "file")
    if ($text === '' && !$file) json_error('Type a message first.');
    if (too_long($text, 2000)) json_error('Keep messages under 2,000 characters.');

    save_message($userId, (int) $admin['admin_id'], 'Admin', $text, $file, $reportNo);
    json_success($reportNo ? "Report #$reportNo sent." : ($file ? 'File sent.' : 'Sent.'));
}

$userId = positive_int((string) ($_GET['userId'] ?? ''));

if ($userId !== null) {
    $stmt = db()->prepare(
        'SELECT m.message_id, m.sender_type, m.message_text, m.sent_datetime, m.report_no, m.file_name, m.file_size, m.file_type, a.admin_fullname,
                r.category, r.report_status, r.report_datetime
         FROM messages m LEFT JOIN admin_profile a ON a.admin_id = m.admin_id
         LEFT JOIN reports r ON r.report_no = m.report_no
         WHERE m.user_id = ? ORDER BY m.sent_datetime ASC, m.message_id ASC'
    );
    $stmt->execute([$userId]);
    send_json([
        'success' => true,
        'person' => person($userId),
        'messages' => array_map(fn ($m) => [
            'from' => $m['sender_type'] === 'Admin' ? 'guidance' : 'them',
            'text' => $m['message_text'],
            'sentAt' => $m['sent_datetime'],
            'staffName' => $m['admin_fullname'],
            'case' => message_case($m),
            'file' => message_file($m),
        ], $stmt->fetchAll()),
    ]);
}

$rows = db()->query(
    'SELECT u.user_id, u.account_type, u.guest_id, u.full_name, last.message_text, last.sent_datetime, last.sender_type
     FROM users u
     JOIN LATERAL (
         SELECT COALESCE(NULLIF(message_text, \'\'), \'File: \' || file_name) AS message_text, sent_datetime, sender_type FROM messages
         WHERE messages.user_id = u.user_id
         ORDER BY sent_datetime DESC, message_id DESC LIMIT 1
     ) last ON TRUE
     ORDER BY last.sent_datetime DESC'
)->fetchAll();

send_json(['success' => true, 'conversations' => array_map(fn ($r) => [
    'userId' => (int) $r['user_id'],
    'name' => display_name($r),
    'accountType' => $r['account_type'],
    'lastText' => $r['message_text'],
    'lastAt' => $r['sent_datetime'],
    'waitingForReply' => $r['sender_type'] === 'Student',
], $rows)]);
