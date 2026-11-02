<?php
// Download a file attached to a message.
// GET ?id=MESSAGE_ID
// Staff: files in chats they may open (advocates: their grade level). Students and guests: their own chats.
// Files of deleted messages can't be downloaded.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');

$id = positive_int((string) ($_GET['id'] ?? ''));
if ($id === null) json_error('Missing file.');

if (!has_session_cookie()) json_session_expired();
start_session();
$stmt = db()->prepare(
    'SELECT m.user_id, m.case_no, m.file_name, m.file_type, m.file_data, u.grade_level AS user_grade, r.grade_level AS case_grade
     FROM messages m JOIN users u ON u.user_id = m.user_id LEFT JOIN reports r ON r.report_no = m.case_no
     WHERE m.message_id = ? AND m.file_name IS NOT NULL AND m.deleted_at IS NULL'
);
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!empty($_SESSION['adminId'])) {
    $admin = require_admin('counselor', 'advocate');
    if ($row && !staff_sees_grade($admin, $row['case_no'] !== null ? $row['case_grade'] : $row['user_grade'])) $row = false;
} else {
    $user = require_user();
    if ($row && (int) $row['user_id'] !== (int) $user['user_id']) $row = false; // not their chat
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
