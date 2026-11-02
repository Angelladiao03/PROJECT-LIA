<?php
// Edit Profile (permanent student accounts only, like the prototype's My Account page).
// POST: username, gradeLevel, section, adviser, contactNumber

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$user = require_user();

if ($user['account_type'] !== 'student') {
    json_error('Guest accounts have no profile to edit. Ask for a permanent student account first.', 403);
}

$username = input('username');
$grade = grade_input('gradeLevel');
$section = input('section');
$adviser = input('adviser');
$contact = input('contactNumber');

if ($error = username_error($username)) json_error($error);
if ($grade === null) json_error('Choose your grade level.');
if ($error = section_error($grade, $section)) json_error($error);
if ($adviser === '' || too_long($adviser, 150)) json_error("Enter your adviser's name.");
if ($error = contact_number_error($contact)) json_error($error);
if (contact_in_use($contact, (int) $user['user_id'])) json_error('This phone number already belongs to another account.', 409);

// The username must not belong to someone else (or be waiting in someone's request).
$stmt = db()->prepare(
    "SELECT 1 FROM users WHERE LOWER(username) = LOWER(?) AND user_id <> ?
     UNION ALL
     SELECT 1 FROM activation_requests WHERE LOWER(username) = LOWER(?) AND status = 'Pending' AND user_id <> ?"
);
$stmt->execute([$username, $user['user_id'], $username, $user['user_id']]);
if ($stmt->fetch()) json_error('That username is taken. Choose another.');

db()->prepare(
    'UPDATE users SET username = ?, grade_level = ?, section = ?, grade_section = ?, adviser_name = ?, contact_number = ? WHERE user_id = ?'
)->execute([$username, $grade, $section, grade_section_label($grade, $section), $adviser, $contact, $user['user_id']]);

$user = find_user((int) $user['user_id']);
json_success('Profile updated.', ['account' => public_account($user)]);
