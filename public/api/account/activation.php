<?php
// Ask the guidance office to turn a guest account into a permanent student account.
// POST (multipart form): fullName, username, gradeSection, adviser, contactNumber,
//                        consent ("yes"), idPhoto (JPG, PNG or WEBP image, max 3 MB)
//
// Privacy: the ID photo is only visible to guidance staff, and it is
// deleted as soon as they approve or decline the request.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$user = require_user();

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

if ($user['account_type'] === 'student') json_error('Your account is already a permanent student account.');

$stmt = db()->prepare("SELECT 1 FROM activation_requests WHERE user_id = ? AND status = 'Pending'");
$stmt->execute([$user['user_id']]);
if ($stmt->fetch()) json_error('You already sent a request. Wait for the guidance office to review it.');

$fullName = input('fullName');
$username = input('username');
$gradeSection = input('gradeSection');
$adviser = input('adviser');
$contact = input('contactNumber');

if ($fullName === '' || too_long($fullName, 150)) json_error('Enter your full name.');
if ($error = username_error($username)) json_error($error);
if ($gradeSection === '' || too_long($gradeSection, 50)) json_error('Enter your grade and section, like 10 - Sampaguita.');
if ($adviser === '' || too_long($adviser, 150)) json_error("Enter your adviser's name.");
if ($error = contact_number_error($contact)) json_error($error);
if (input('consent') !== 'yes') json_error('Check the box to agree to the ID photo being reviewed.');

// Username must not be used by another account or another pending request.
$stmt = db()->prepare(
    "SELECT 1 FROM users WHERE LOWER(username) = LOWER(?)
     UNION ALL
     SELECT 1 FROM activation_requests WHERE LOWER(username) = LOWER(?) AND status = 'Pending'"
);
$stmt->execute([$username, $username]);
if ($stmt->fetch()) json_error('That username is taken. Choose another.');

// ----- Check the photo -----
$file = $_FILES['idPhoto'] ?? null;
if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) json_error('Add a photo of your school ID.');
if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || $file['size'] > MAX_PHOTO_BYTES) {
    json_error('The photo is too big. Use a photo under 3 MB.');
}
if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) json_error('The photo did not upload. Try again.');

$info = @getimagesize($file['tmp_name']); // reads the real file type, not just the name
$allowed = [IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_PNG => 'image/png', IMAGETYPE_WEBP => 'image/webp'];
if ($info === false || !isset($allowed[$info[2]])) json_error('The ID photo must be a JPG, PNG or WEBP image.');

$photo = file_get_contents($file['tmp_name']);

$stmt = db()->prepare(
    'INSERT INTO activation_requests
        (user_id, full_name, username, grade_section, adviser_name, contact_number, id_photo, id_photo_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bindValue(1, $user['user_id'], PDO::PARAM_INT);
$stmt->bindValue(2, $fullName);
$stmt->bindValue(3, $username);
$stmt->bindValue(4, $gradeSection);
$stmt->bindValue(5, $adviser);
$stmt->bindValue(6, $contact);
$stmt->bindValue(7, $photo, PDO::PARAM_LOB);
$stmt->bindValue(8, $allowed[$info[2]]);
$stmt->execute();

json_success('Request sent. The guidance office will review it and email you the result.');
