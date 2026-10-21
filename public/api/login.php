<?php
// Student login. Replaces LoginServlet.java.
// POST: username (the student's username OR their LRN), password

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');

$identifier = post('username');
$password = post('password');

if (is_blank($identifier)) json_error('Please enter your username or LRN.');
if (is_blank($password)) json_error('Please enter your password.');

$stmt = db()->prepare(
    'SELECT student_lrn, student_fullName AS full_name, student_username,
            student_password, status
     FROM students
     WHERE student_username = ? OR CAST(student_lrn AS TEXT) = ?'
);
$stmt->execute([$identifier, $identifier]);
$student = null;
foreach ($stmt->fetchAll() as $row) {
    if (check_password($password, $row['student_password'])) {
        $student = $row;
        break;
    }
}

if ($student === null) {
    json_error('Invalid Username/LRN or Password!');
}

$lrn = (string) $student['student_lrn'];

// Upgrade an old plain-text password to a secure hash.
if (!is_hashed($student['student_password'])) {
    db()->prepare('UPDATE students SET student_password = ? WHERE student_lrn = ?')
        ->execute([hash_password($password), $lrn]);
}

if ($student['status'] !== 'Approved') {
    json_error('Your account is still waiting for admin approval.');
}

log_in_student($lrn, $student['student_username']);

json_success('Login successful.', [
    'lrn' => $lrn,
    'fullName' => as_text($student['full_name']),
]);
