<?php
// Your chats with the guidance office: one general chat, plus one chat per report you sent.
//
// GET                 -> { threads: [...] }  the general chat first, then your reports (newest first)
// GET ?case=general   -> the general chat
// GET ?case=12        -> the chat about your report with reportNo 12 (shown as e.g. #2026-0012)
//                        After the report is Resolved or Rejected, staff may close its chat (read-only).
//                        (opening a chat marks the guidance office's messages in it as read)
// POST case=general|12, text, file (optional) -> send (PDF, Word, JPG, PNG; up to 5 MB)
// POST action=edit   id, text   -> edit one of your own messages
// POST action=delete id         -> delete one of your own messages
//
// Staff never see who sent an anonymous report, even when they reply in its chat.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$user = require_user();
$userId = (int) $user['user_id'];

// 'general' -> null; a report number -> that number, if the report is yours
function my_case(int $userId, string $value): ?int
{
    if ($value === '' || $value === 'general') return null;
    $caseNo = positive_int($value);
    $stmt = db()->prepare('SELECT 1 FROM reports WHERE report_no = ? AND user_id = ?');
    $stmt->execute([$caseNo ?? 0, $userId]);
    if (!$stmt->fetch()) json_error('That report was not found.', 404);
    return $caseNo;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = input('action');
    if ($action === 'edit' || $action === 'delete') edit_or_delete_message($action, ['student' => $userId]);

    $caseNo = my_case($userId, input('case'));
    $file = read_attachment(); // optional: e.g. the filled-up form sent back (multipart field "file")
    $text = message_text_input(!$file);
    save_message($userId, null, 'Student', $text, $file, $caseNo);
    json_success($file ? 'File sent.' : 'Sent.');
}

// ----- One chat -----
if (isset($_GET['case'])) {
    $caseNo = my_case($userId, (string) $_GET['case']);
    db()->prepare(
        "UPDATE messages SET read_at = NOW()
         WHERE user_id = ? AND case_no IS NOT DISTINCT FROM CAST(? AS INT) AND sender_type = 'Admin' AND read_at IS NULL"
    )->execute([$userId, $caseNo]);
    send_json([
        'success' => true,
        'closed' => chat_state($caseNo)['closed'], // closed by staff: read-only
        'messages' => array_map(fn ($m) => message_out($m, 'student'), thread_messages($userId, $caseNo)),
    ]);
}

// ----- List of chats -----
$stmt = db()->prepare(
    "SELECT DISTINCT ON (m.case_no) m.case_no, m.message_text, m.file_name, m.deleted_at, m.sent_datetime, m.sender_type,
            COUNT(*) FILTER (WHERE m.sender_type = 'Admin' AND m.read_at IS NULL AND m.deleted_at IS NULL)
                OVER (PARTITION BY m.case_no) AS unread
     FROM messages m WHERE m.user_id = ?
     ORDER BY m.case_no, m.sent_datetime DESC, m.message_id DESC"
);
$stmt->execute([$userId]);
$last = [];
foreach ($stmt->fetchAll() as $row) $last[$row['case_no'] ?? 'general'] = $row;

$thread = fn (string $key, array $extra) => $extra + [
    'key' => $key,
    'lastText' => isset($last[$key]) ? preview_text($last[$key]) : null,
    'lastAt' => $last[$key]['sent_datetime'] ?? null,
    'unread' => (int) ($last[$key]['unread'] ?? 0),
];

$threads = [$thread('general', ['case' => 'general', 'title' => 'Guidance Office', 'reportNo' => null])];
$reports = db()->prepare('SELECT report_no, case_id, category, report_status, is_anonymous, chat_closed_at FROM reports WHERE user_id = ? ORDER BY report_datetime DESC');
$reports->execute([$userId]);
foreach ($reports->fetchAll() as $r) {
    $threads[] = $thread((string) $r['report_no'], [
        'case' => (string) $r['report_no'],
        'title' => 'Report #' . $r['case_id'],
        'reportNo' => (int) $r['report_no'],
        'caseId' => $r['case_id'],
        'closed' => $r['chat_closed_at'] !== null,
        'category' => $r['category'],
        'status' => $r['report_status'],
        'anonymous' => (bool) $r['is_anonymous'],
    ]);
}
send_json(['success' => true, 'threads' => $threads]);
