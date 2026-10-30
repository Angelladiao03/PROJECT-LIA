<?php
// Your conversation with the guidance office.
// GET  -> { messages: [{ from: "me" | "guidance", text, sentAt, staffName, case }] }
//         (opening the conversation marks the guidance office's messages as read)
// POST text=..., file (optional) -> send a message, optionally with a file (PDF, Word, JPG, PNG; up to 5 MB)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$user = require_user();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $text = input('text');
    $file = read_attachment(); // optional: e.g. the filled-up form sent back (multipart field "file")
    if ($text === '' && !$file) json_error('Type a message first.');
    if (too_long($text, 2000)) json_error('Keep messages under 2,000 characters.');

    save_message((int) $user['user_id'], null, 'Student', $text, $file);
    json_success($file ? 'File sent.' : 'Sent.');
}

// Opening the conversation marks the guidance office's messages as read
db()->prepare("UPDATE messages SET read_at = NOW() WHERE user_id = ? AND sender_type = 'Admin' AND read_at IS NULL")
    ->execute([$user['user_id']]);

$stmt = db()->prepare(
    'SELECT m.message_id, m.sender_type, m.message_text, m.sent_datetime, m.report_no, m.file_name, m.file_size, m.file_type, a.admin_fullname,
            r.category, r.report_status, r.report_datetime
     FROM messages m LEFT JOIN admin_profile a ON a.admin_id = m.admin_id
     LEFT JOIN reports r ON r.report_no = m.report_no
     WHERE m.user_id = ? ORDER BY m.sent_datetime ASC, m.message_id ASC'
);
$stmt->execute([$user['user_id']]);

send_json(['success' => true, 'messages' => array_map(fn ($m) => [
    'from' => $m['sender_type'] === 'Admin' ? 'guidance' : 'me',
    'text' => $m['message_text'],
    'sentAt' => $m['sent_datetime'],
    'staffName' => $m['sender_type'] === 'Admin' ? $m['admin_fullname'] : null,
    'case' => message_case($m), // a report case the guidance office attached, if any
    'file' => message_file($m), // a file in the message, downloaded from messages/file.php?id=...
], $stmt->fetchAll())]);
