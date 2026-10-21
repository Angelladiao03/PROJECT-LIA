<?php
// Student sign-up. Replaces RegisterServlet.java.
// POST: lrn, fullName, username, password, rePassword, adviser,
//       gradeSection, email, contactNumber
// New accounts are "Pending" until an admin approves them.

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');

$lrn = post('lrn');
$fullName = post('fullName');
$username = post('username');
$password = post('password');
$rePassword = post('rePassword');
$adviser = post('adviser');
$gradeSection = post('gradeSection');
$email = post('email');
$contactNumber = post('contactNumber');

// Check each field separately so the student knows exactly what's missing.
if (is_blank($lrn)) json_error('Please enter your LRN.');
if (is_blank($fullName)) json_error('Please enter your full name.');
if (is_blank($username)) json_error('Please enter a username.');
if (is_blank($gradeSection)) json_error('Please enter your grade and section.');
if (is_blank($adviser)) json_error("Please enter your adviser's name.");
if (is_blank($email)) json_error('Please enter your email address.');
if (is_blank($contactNumber)) json_error('Please enter your contact number.');
if (is_blank($password)) json_error('Please enter a password.');

if ($rePassword !== null && $password !== $rePassword) {
    json_error('Password does not match!');
}

$lrn = trim($lrn);
$contactNumber = trim($contactNumber);

if ($error = lrn_error($lrn)) json_error($error);
if (!is_valid_email($email)) json_error('Please enter a valid email address!');
if ($error = contact_number_error($contactNumber)) json_error($error);
if ($error = username_error($username)) json_error($error);
if ($error = password_error($password)) json_error($error);

// Check each "already used" case separately for a clear message.
function exists(string $sql, string $value): bool
{
    $stmt = db()->prepare($sql);
    $stmt->execute([$value]);
    return $stmt->fetch() !== false;
}

if (exists('SELECT 1 FROM students WHERE student_lrn = ?', $lrn)) {
    json_error('This LRN is already registered. Please log in instead.');
}
if (exists('SELECT 1 FROM students WHERE student_username = ?', $username)) {
    json_error('That username is already taken. Please choose another.');
}
if (exists('SELECT 1 FROM students WHERE email = ?', $email)) {
    json_error('That email address is already registered.');
}

$stmt = db()->prepare(
    'INSERT INTO students
        (student_lrn, student_fullName, student_username, student_password,
         adviser_name, grade_section, email, contact_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $lrn, $fullName, $username, hash_password($password),
    $adviser, $gradeSection, $email, $contactNumber,
]);

json_success('Account registered! Please wait for approval.');
