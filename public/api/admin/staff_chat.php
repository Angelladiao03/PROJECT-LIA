<?php
// Staff-to-staff chat: every staff member (counselor, advocates, principal, security)
// can message every other staff member. Separate from the chats with students.
//
// GET                    -> { people: [...] } every other staff member, newest chat first
// GET ?with=ID           -> { person, messages } one chat (opening it marks their messages as read)
// GET ?file=MESSAGE_ID   -> downloads a file sent in one of YOUR staff chats
// POST with=ID, text, file (optional)   -> send a message (PDF, Word, JPG, PNG; up to 5 MB)
// POST action=edit, id, text  /  action=delete, id   -> change one of YOUR OWN messages
//      "Deleted" only hides the message; the row and older versions (staff_message_edits) are kept.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin(); // any staff role
$me = (int) $admin['admin_id'];

// Another staff member, or stop with "not found". (Everyone can message everyone, but not themselves.)
function chat_partner(int $me, ?int $id): array
{
    if ($id === null || $id === $me) json_error('Choose a staff member first.');
    $stmt = db()->prepare('SELECT admin_id, admin_fullname, staff_role, grade_level FROM admin_profile WHERE admin_id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('That staff account was not found.', 404);
    return $row;
}

function staff_person(array $a): array
{
    return [
        'adminId' => (int) $a['admin_id'],
        'name' => $a['admin_fullname'],
        'role' => $a['staff_role'],
        'roleLabel' => staff_role_label($a),
    ];
}

// ----- Download a file -----
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['file'])) {
    $stmt = db()->prepare(
        'SELECT file_name, file_type, file_data FROM staff_messages
         WHERE message_id = ? AND file_name IS NOT NULL AND deleted_at IS NULL AND (from_admin_id = ? OR to_admin_id = ?)'
    );
    $stmt->execute([positive_int((string) $_GET['file']) ?? 0, $me, $me]);
    $row = $stmt->fetch();
    if (!$row) json_error('That file was not found.', 404);
    $data = is_resource($row['file_data']) ? stream_get_contents($row['file_data']) : $row['file_data'];
    header('Content-Type: ' . $row['file_type']);
    header('Content-Length: ' . strlen($data));
    header("Content-Disposition: attachment; filename=\"" . str_replace('"', '', $row['file_name']) . "\"; filename*=UTF-8''" . rawurlencode($row['file_name']));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store');
    echo $data;
    exit;
}

// ----- POST: send, edit, delete -----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = input('action');
    if ($action === 'edit' || $action === 'delete') {
        $id = positive_int(input('id'));
        $stmt = db()->prepare('SELECT * FROM staff_messages WHERE message_id = ? AND from_admin_id = ?');
        $stmt->execute([$id ?? 0, $me]);
        $m = $stmt->fetch();
        if (!$m) json_error('You can only change messages you sent.', 403);
        if ($m['deleted_at'] !== null) json_error('This message was already deleted.', 409);
        if ($action === 'delete') {
            db()->prepare('UPDATE staff_messages SET deleted_at = NOW() WHERE message_id = ?')->execute([$id]);
            audit($me, 'staff_message.delete', 'staff_message', $id);
            json_success('Message deleted.');
        }
        $text = message_text_input($m['file_name'] === null); // text may be empty only if there's a file
        if ($text === $m['message_text']) json_success('No changes.');
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO staff_message_edits (message_id, old_text) VALUES (?, ?)')->execute([$id, $m['message_text']]);
        $pdo->prepare('UPDATE staff_messages SET message_text = ?, edited_at = NOW() WHERE message_id = ?')->execute([$text, $id]);
        $pdo->commit();
        audit($me, 'staff_message.edit', 'staff_message', $id);
        json_success('Message edited.');
    }

    $to = chat_partner($me, positive_int(input('with')));
    $file = read_attachment(); // optional (multipart field "file")
    $text = message_text_input(!$file);
    $stmt = db()->prepare(
        'INSERT INTO staff_messages (from_admin_id, to_admin_id, message_text, file_name, file_type, file_size, file_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bindValue(1, $me, PDO::PARAM_INT);
    $stmt->bindValue(2, (int) $to['admin_id'], PDO::PARAM_INT);
    $stmt->bindValue(3, $text);
    $stmt->bindValue(4, $file['name'] ?? null);
    $stmt->bindValue(5, $file['type'] ?? null);
    $stmt->bindValue(6, $file['size'] ?? null, $file ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->bindValue(7, $file['data'] ?? null, $file ? PDO::PARAM_LOB : PDO::PARAM_NULL);
    $stmt->execute();
    json_success($file ? 'File sent.' : 'Sent.');
}

// ----- GET ?with=ID: one chat -----
if (isset($_GET['with'])) {
    $other = chat_partner($me, positive_int((string) $_GET['with']));
    $otherId = (int) $other['admin_id'];
    // Opening the chat marks their messages to me as read
    db()->prepare('UPDATE staff_messages SET read_at = NOW() WHERE from_admin_id = ? AND to_admin_id = ? AND read_at IS NULL')
        ->execute([$otherId, $me]);
    $stmt = db()->prepare(
        'SELECT m.message_id, m.from_admin_id, m.message_text, m.sent_datetime, m.edited_at, m.deleted_at,
                m.file_name, m.file_size, m.file_type, a.admin_fullname
         FROM staff_messages m JOIN admin_profile a ON a.admin_id = m.from_admin_id
         WHERE (m.from_admin_id = ? AND m.to_admin_id = ?) OR (m.from_admin_id = ? AND m.to_admin_id = ?)
         ORDER BY m.sent_datetime ASC, m.message_id ASC'
    );
    $stmt->execute([$me, $otherId, $otherId, $me]);
    send_json([
        'success' => true,
        'person' => staff_person($other),
        'messages' => array_map(function ($m) use ($me) {
            $deleted = $m['deleted_at'] !== null;
            return [
                'id' => (int) $m['message_id'],
                'mine' => (int) $m['from_admin_id'] === $me,
                'text' => $deleted ? '' : $m['message_text'],
                'deleted' => $deleted,
                'edited' => !$deleted && $m['edited_at'] !== null,
                'sentAt' => $m['sent_datetime'],
                'staffName' => $m['admin_fullname'],
                'case' => null,
                'file' => $deleted || !$m['file_name'] ? null : [
                    'id' => (int) $m['message_id'], 'name' => $m['file_name'], 'size' => (int) $m['file_size'],
                    'type' => $m['file_type'], 'url' => '/api/admin/staff_chat.php?file=' . (int) $m['message_id'],
                ],
            ];
        }, $stmt->fetchAll()),
    ]);
}

// ----- GET: every other staff member, with the newest message of each chat -----
$stmt = db()->prepare(
    'SELECT a.admin_id, a.admin_fullname, a.staff_role, a.grade_level,
            last.message_text, last.file_name, last.deleted_at, last.sent_datetime, last.from_admin_id,
            (SELECT COUNT(*) FROM staff_messages u WHERE u.from_admin_id = a.admin_id AND u.to_admin_id = :me1
               AND u.read_at IS NULL AND u.deleted_at IS NULL) AS unread
     FROM admin_profile a
     LEFT JOIN LATERAL (
         SELECT m.message_text, m.file_name, m.deleted_at, m.sent_datetime, m.from_admin_id FROM staff_messages m
         WHERE (m.from_admin_id = a.admin_id AND m.to_admin_id = :me2) OR (m.from_admin_id = :me3 AND m.to_admin_id = a.admin_id)
         ORDER BY m.sent_datetime DESC, m.message_id DESC LIMIT 1
     ) last ON TRUE
     WHERE a.admin_id <> :me4
     -- newest chat first; people you haven\'t chatted with yet: counselor, principal, advocates (Grade 7 to 12), security
     ORDER BY last.sent_datetime DESC NULLS LAST,
              CASE a.staff_role WHEN \'counselor\' THEN 1 WHEN \'principal\' THEN 2 WHEN \'advocate\' THEN 3 ELSE 4 END,
              a.grade_level NULLS FIRST, a.admin_fullname'
);
$stmt->execute(['me1' => $me, 'me2' => $me, 'me3' => $me, 'me4' => $me]);
send_json(['success' => true, 'people' => array_map(fn ($r) => staff_person($r) + [
    'lastText' => $r['sent_datetime'] === null ? null
        : ($r['deleted_at'] !== null ? 'Message deleted' : ($r['message_text'] !== '' ? $r['message_text'] : 'File: ' . $r['file_name'])),
    'lastAt' => $r['sent_datetime'],
    'lastFromMe' => $r['sent_datetime'] !== null && (int) $r['from_admin_id'] === $me,
    'unread' => (int) $r['unread'],
], $stmt->fetchAll())]);
