<?php
// Send an SOS alert to the guidance office.
// POST: location (one of REPORT_LOCATIONS), locationOther (when location is "Other"), description

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$user = require_user();

$location = input('location');
$description = input('description');

if (!in_array($location, REPORT_LOCATIONS, true)) json_error('Choose where you are right now.');
if ($location === 'Other') {
    $other = input('locationOther');
    if ($other === '' || too_long($other, 200)) json_error('Type where you are right now.');
    $location = 'Other: ' . $other;
}
if ($description === '' || too_long($description, 1000)) json_error('Say briefly what is happening.');

// Stops accidental double-taps: one SOS per 30 seconds per account.
$stmt = db()->prepare("SELECT 1 FROM sos_alerts WHERE user_id = ? AND sos_datetime > NOW() - INTERVAL '30 seconds'");
$stmt->execute([$user['user_id']]);
if ($stmt->fetch()) json_error('Your SOS was already sent. The guidance office has it.', 429);

$stmt = db()->prepare(
    'INSERT INTO sos_alerts (user_id, sos_location, sos_description) VALUES (?, ?, ?) RETURNING sos_no'
);
$stmt->execute([$user['user_id'], $location, $description]);

json_success('SOS sent. The guidance office has been alerted.', ['sosNo' => (int) $stmt->fetchColumn()]);
