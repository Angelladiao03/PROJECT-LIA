<?php
// The logged-in student's own reports. Replaces MyReportsServlet.java.
// GET -> [{ reportNo, category, location, status, dateTime }, ...]

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('GET');

$lrn = current_student_lrn();
if ($lrn === null) json_session_expired();

$stmt = db()->prepare(
    'SELECT report_no, category, report_location, report_status, report_datetime
     FROM reports WHERE student_lrn = ? ORDER BY report_datetime DESC'
);
$stmt->execute([$lrn]);

send_json(rows_as_text($stmt->fetchAll(), [
    'reportNo' => 'report_no',
    'category' => 'category',
    'location' => 'report_location',
    'status' => 'report_status',
    'dateTime' => 'report_datetime',
]));
