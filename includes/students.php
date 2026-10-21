<?php
// Shared by student_profile.php and admin_messages.php ("View Info").

// Returns the student's profile as text fields, or null if not found.
function get_student_profile(string $lrn): ?array
{
    $stmt = db()->prepare(
        'SELECT student_lrn, student_fullName AS full_name, adviser_name, grade_section,
                email, student_username, contact_number
         FROM students WHERE student_lrn = ?'
    );
    $stmt->execute([$lrn]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    return [
        'fullName' => as_text($row['full_name']),
        'adviser' => as_text($row['adviser_name']),
        'gradeSection' => as_text($row['grade_section']),
        'email' => as_text($row['email']),
        'username' => as_text($row['student_username']),
        'contactNumber' => as_text($row['contact_number']),
        'lrn' => as_text($row['student_lrn']),
    ];
}
