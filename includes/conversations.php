<?php
// Shared by messages.php (student side) and admin_messages.php (admin side).

// One student's full conversation, oldest first (like a normal chat).
function get_conversation(string $lrn): array
{
    $stmt = db()->prepare(
        'SELECT sender_type, message_text, sent_datetime FROM messages
         WHERE student_lrn = ? ORDER BY sent_datetime ASC'
    );
    $stmt->execute([$lrn]);
    return rows_as_text($stmt->fetchAll(), [
        'sender' => 'sender_type',
        'text' => 'message_text',
        'time' => 'sent_datetime',
    ]);
}
