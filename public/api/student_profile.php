<?php
// Student "My Account" page. Replaces StudentProfileServlet.java.
// GET  -> the logged-in student's profile
// POST username, gradeSection, adviser -> updates those fields

require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/students.php';
require_method('GET', 'POST');

$lrn = current_student_lrn();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($lrn === null) json_session_expired();

    $profile = get_student_profile($lrn);
    if ($profile === null) json_error('Profile not found.');

    send_json(['success' => true] + $profile);
}

// POST
if ($lrn === null) json_error('You must be logged in.');

$username = post('username');
$gradeSection = post('gradeSection');
$adviser = post('adviser');

if (is_blank($username)) json_error('Please enter a username.');
if (is_blank($gradeSection)) json_error('Please enter your grade and section.');
if (is_blank($adviser)) json_error("Please enter your adviser's name.");
if ($error = username_error($username)) json_error($error);

$stmt = db()->prepare(
    'SELECT 1 FROM students WHERE student_username = ? AND student_lrn <> ?'
);
$stmt->execute([$username, $lrn]);
if ($stmt->fetch()) {
    json_error('That username is already taken. Please choose another.');
}

db()->prepare(
    'UPDATE students SET student_username = ?, grade_section = ?, adviser_name = ?
     WHERE student_lrn = ?'
)->execute([$username, $gradeSection, $adviser, $lrn]);

$_SESSION['username'] = $username;
json_success('Profile updated.');
