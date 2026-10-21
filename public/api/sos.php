<?php
// Send an SOS alert. Replaces SosServlet.java.
// POST: location, description (both required)

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');

$lrn = current_student_lrn();
if ($lrn === null) json_error('You must be logged in to send an SOS alert.');

$location = post('location');
$description = post('description');

if (is_blank($location) || is_blank($description)) {
    json_error('Please fill out both your location and a brief description.');
}

$stmt = db()->prepare(
    'INSERT INTO sos_alerts (student_lrn, sos_location, sos_description)
     VALUES (?, ?, ?) RETURNING sos_no'
);
$stmt->execute([$lrn, $location, $description]);

json_success('The guidance office has been notified immediately.', [
    'sosNo' => as_text($stmt->fetchColumn()),
]);
