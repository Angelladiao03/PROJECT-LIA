<?php
// Admin "Request Account" page - approve or reject student sign-ups.
// Replaces AdminRequestServlet.java.
//
// GET                          -> every student still waiting for approval
// POST action=approve&lrn=..   Pending -> Approved
// POST action=reject&lrn=..    deletes the pending sign-up (so the LRN can sign up again)

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('GET', 'POST');
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = db()->query(
        "SELECT student_lrn, student_fullName AS full_name, student_username,
                adviser_name, grade_section, email, contact_number, registered_at
         FROM students WHERE status = 'Pending' ORDER BY registered_at ASC"
    )->fetchAll();

    send_json(rows_as_text($rows, [
        'lrn' => 'student_lrn',
        'fullName' => 'full_name',
        'username' => 'student_username',
        'adviser' => 'adviser_name',
        'gradeSection' => 'grade_section',
        'email' => 'email',
        'contactNumber' => 'contact_number',
        'registeredAt' => 'registered_at',
    ]));
}

// POST
$action = post('action');
$lrn = post('lrn');
if ($action === null || $lrn === null) json_error('Missing action or lrn.');
if (!ctype_digit($lrn)) json_error('Invalid LRN.');

switch ($action) {
    case 'approve':
        $stmt = db()->prepare(
            "UPDATE students SET status = 'Approved' WHERE student_lrn = ? AND status = 'Pending'"
        );
        break;
    case 'reject':
        $stmt = db()->prepare(
            "DELETE FROM students WHERE student_lrn = ? AND status = 'Pending'"
        );
        break;
    default:
        json_error('Unknown action: ' . $action);
}

$stmt->execute([$lrn]);
$stmt->rowCount() === 1 ? json_success('Done.') : json_error('Update failed.');
