<?php
// Staff: conversations with students and guests.
//
// GET                -> list of conversations (newest message first)
// GET ?userId=12     -> one conversation + who it's with
// POST userId, text  -> send a message to that person

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
        'contactNumber' => $user['account_type'] === 'student' ? $user['contact_number'] : null,
        'email' => $user['account_type'] === 'student' ? $user['email'] : null,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = positive_int(input('userId'));
    $text = input('text');
    if ($userId === null) json_error('Choose a conversation first.');
    if ($text === '') json_error('Type a message first.');
    if (too_long($text, 2000)) json_error('Keep messages under 2,000 characters.');
    person($userId); // checks the account exists

    db()->prepare("INSERT INTO messages (user_id, admin_id, sender_type, message_text) VALUES (?, ?, 'Admin', ?)")
        ->execute([$userId, $admin['admin_id'], $text]);
    json_success('Sent.');
}

$userId = positive_int((string) ($_GET['userId'] ?? ''));

if ($userId !== null) {
    $stmt = db()->prepare(
        'SELECT m.sender_type, m.message_text, m.sent_datetime, a.admin_fullname
         FROM messages m LEFT JOIN admin_profile a ON a.admin_id = m.admin_id
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
        ], $stmt->fetchAll()),
    ]);
}

$rows = db()->query(
    'SELECT u.user_id, u.account_type, u.guest_id, u.full_name, last.message_text, last.sent_datetime, last.sender_type
     FROM users u
     JOIN LATERAL (
         SELECT message_text, sent_datetime, sender_type FROM messages
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
