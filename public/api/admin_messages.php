<?php
// Admin Messages page. Replaces AdminMessageServlet.java.
//
// GET              -> sidebar: every approved student + their latest message
// GET ?lrn=123     -> full conversation with that student
// GET ?info=123    -> that student's profile ("View Info" panel)
// POST lrn=123&text=...  -> admin sends a message to that student

require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/conversations.php';
require_once __DIR__ . '/../../includes/students.php';
require_method('GET', 'POST');
$adminId = require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $info = $_GET['info'] ?? '';
    $lrn = $_GET['lrn'] ?? '';

    if ($info !== '') {
        if (!ctype_digit($info)) send_json([]);
        $profile = get_student_profile($info);
        if ($profile === null) json_error('Student not found.');
        send_json(['success' => true] + $profile);
    }

    if ($lrn !== '') {
        if (!ctype_digit($lrn)) send_json([]);
        send_json(get_conversation($lrn));
    }

    // Sidebar list: newest conversations first, students with no messages last.
    $rows = db()->query(
        "SELECT s.student_lrn, s.student_fullName AS full_name,
                m.message_text, m.sent_datetime
         FROM students s
         LEFT JOIN LATERAL (
             SELECT message_text, sent_datetime FROM messages
             WHERE messages.student_lrn = s.student_lrn
             ORDER BY sent_datetime DESC LIMIT 1
         ) m ON TRUE
         WHERE s.status = 'Approved'
         ORDER BY (m.sent_datetime IS NULL) ASC, m.sent_datetime DESC, s.student_fullName ASC"
    )->fetchAll();

    send_json(rows_as_text($rows, [
        'lrn' => 'student_lrn',
        'fullName' => 'full_name',
        'lastText' => 'message_text',
        'lastTime' => 'sent_datetime',
    ]));
}

// POST
$lrn = post('lrn');
$text = post('text');
if ($lrn === null || is_blank($text)) json_error('Missing student or message text.');
if (!ctype_digit($lrn)) json_error('Invalid student.');

db()->prepare(
    "INSERT INTO messages (student_lrn, admin_id, sender_type, message_text)
     VALUES (?, ?, 'Admin', ?)"
)->execute([$lrn, $adminId, $text]);

json_success('Sent.');
