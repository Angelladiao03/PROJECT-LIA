<?php
// Download a file attached to a message.
// GET ?id=MESSAGE_ID
// Staff can open any message file. Students and guests only files in their own conversation.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');

$id = positive_int((string) ($_GET['id'] ?? ''));
if ($id === null) json_error('Missing file.');

if (!has_session_cookie()) json_session_expired();
start_session();
$stmt = db()->prepare('SELECT user_id, file_name, file_type, file_data FROM messages WHERE message_id = ? AND file_name IS NOT NULL');
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!empty($_SESSION['adminId'])) {
    require_admin();
} else {
    $user = require_user();
    if ($row && (int) $row['user_id'] !== (int) $user['user_id']) $row = false; // not their conversation
}
if (!$row) json_error('That file was not found.', 404);

$data = is_resource($row['file_data']) ? stream_get_contents($row['file_data']) : $row['file_data'];
header('Content-Type: ' . $row['file_type']);
header('Content-Length: ' . strlen($data));
// "attachment" = always download, never open inside LagroInAction's pages
header("Content-Disposition: attachment; filename=\"" . str_replace('"', '', $row['file_name']) . "\"; filename*=UTF-8''" . rawurlencode($row['file_name']));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
echo $data;
