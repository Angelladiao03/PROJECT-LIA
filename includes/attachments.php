<?php
// Files attached to messages: forms from the guidance office, and filled-up forms sent back.
// Only PDF, Word, JPG and PNG, up to 5 MB. We check the file's first bytes (its "signature"),
// not just its name, so a program renamed to "form.pdf" is refused.

const ATTACH_MAX_BYTES = 5 * 1024 * 1024;
const ATTACH_TYPES = [
    // extension => [MIME type sent back on download, how the file must start]
    'pdf' => ['application/pdf', '%PDF'],
    'png' => ['image/png', "\x89PNG"],
    'jpg' => ['image/jpeg', "\xFF\xD8\xFF"],
    'jpeg' => ['image/jpeg', "\xFF\xD8\xFF"],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', "PK\x03\x04"],
    'doc' => ['application/msword', "\xD0\xCF\x11\xE0"],
];

// Reads the uploaded file named "file". Returns null if no file was sent,
// otherwise ['name', 'type', 'size', 'data']. Stops with a clear message if it's not allowed.
function read_attachment(): ?array
{
    $f = $_FILES['file'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $f['size'] > ATTACH_MAX_BYTES) {
        json_error('The file is too big. The limit is 5 MB.');
    }
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) json_error('The file could not be uploaded. Try again.');
    if ($f['size'] === 0) json_error('The file is empty.');

    // Clean file name: no folders, no strange characters, not too long
    $name = preg_replace('/[^\w .()\-]+/u', '_', basename((string) $f['name']));
    $name = mb_substr(trim($name, ' .'), -150) ?: 'file';
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!isset(ATTACH_TYPES[$ext])) json_error('Only PDF, Word (.doc, .docx), JPG and PNG files can be sent.');

    $data = file_get_contents($f['tmp_name']);
    [$mime, $signature] = ATTACH_TYPES[$ext];
    if (strncmp($data, $signature, strlen($signature)) !== 0) {
        json_error("This file isn't a real .$ext file. Save it again and send that copy.");
    }
    return ['name' => $name, 'type' => $mime, 'size' => strlen($data), 'data' => $data];
}

// Saves a message (with an optional file and report case). Returns the new message id.
function save_message(int $userId, ?int $adminId, string $sender, string $text, ?array $file, ?int $reportNo = null): int
{
    $stmt = db()->prepare(
        'INSERT INTO messages (user_id, admin_id, sender_type, message_text, report_no, file_name, file_type, file_size, file_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING message_id'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $adminId, $adminId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(3, $sender);
    $stmt->bindValue(4, $text);
    $stmt->bindValue(5, $reportNo, $reportNo === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(6, $file['name'] ?? null);
    $stmt->bindValue(7, $file['type'] ?? null);
    $stmt->bindValue(8, $file['size'] ?? null, $file ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->bindValue(9, $file['data'] ?? null, $file ? PDO::PARAM_LOB : PDO::PARAM_NULL);
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

// What the pages get about a message's file (never the file itself; it's downloaded separately).
function message_file(array $m): ?array
{
    if (empty($m['file_name'])) return null;
    return ['id' => (int) $m['message_id'], 'name' => $m['file_name'], 'size' => (int) $m['file_size'], 'type' => $m['file_type']];
}
