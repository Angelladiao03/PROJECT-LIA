<?php
// Your conversation with the guidance office.
// GET  -> { messages: [{ from: "me" | "guidance", text, sentAt, staffName }] }
// POST text=...  -> send a message

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$user = require_user();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $text = input('text');
    if ($text === '') json_error('Type a message first.');
    if (too_long($text, 2000)) json_error('Keep messages under 2,000 characters.');

    db()->prepare("INSERT INTO messages (user_id, sender_type, message_text) VALUES (?, 'Student', ?)")
        ->execute([$user['user_id'], $text]);
    json_success('Sent.');
}

$stmt = db()->prepare(
    'SELECT m.sender_type, m.message_text, m.sent_datetime, a.admin_fullname
     FROM messages m LEFT JOIN admin_profile a ON a.admin_id = m.admin_id
     WHERE m.user_id = ? ORDER BY m.sent_datetime ASC, m.message_id ASC'
);
$stmt->execute([$user['user_id']]);

send_json(['success' => true, 'messages' => array_map(fn ($m) => [
    'from' => $m['sender_type'] === 'Admin' ? 'guidance' : 'me',
    'text' => $m['message_text'],
    'sentAt' => $m['sent_datetime'],
    'staffName' => $m['sender_type'] === 'Admin' ? $m['admin_fullname'] : null,
], $stmt->fetchAll())]);
