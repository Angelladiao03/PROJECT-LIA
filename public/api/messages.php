<?php
// Student Messages page. Replaces MessageServlet.java.
// GET  -> { connectedAdmin: "<name>" | null, messages: [{sender, text, time}] }
// POST text=...  -> student sends a message

require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/conversations.php';
require_method('GET', 'POST');

$lrn = current_student_lrn();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($lrn === null) json_session_expired();

    // Name of the admin who replied most recently (shown as "You are connected with ...")
    $stmt = db()->prepare(
        "SELECT a.admin_fullname FROM messages m
         JOIN admin_profile a ON a.admin_id = m.admin_id
         WHERE m.student_lrn = ? AND m.sender_type = 'Admin'
         ORDER BY m.sent_datetime DESC LIMIT 1"
    );
    $stmt->execute([$lrn]);
    $connectedAdmin = $stmt->fetchColumn();

    send_json([
        'connectedAdmin' => $connectedAdmin === false ? null : $connectedAdmin,
        'messages' => get_conversation($lrn),
    ]);
}

// POST
if ($lrn === null) json_error('You must be logged in to send messages.');

$text = post('text');
if (is_blank($text)) json_error('Message cannot be empty.');

db()->prepare(
    "INSERT INTO messages (student_lrn, admin_id, sender_type, message_text)
     VALUES (?, NULL, 'Student', ?)"
)->execute([$lrn, $text]);

json_success('Sent.');
