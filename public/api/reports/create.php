<?php
// Send an incident report.
// POST: reporterRole (victim | witness | other), category, categoryOther,
//       location, locationOther, incidentDate (YYYY-MM-DD), description,
//       involvedKnown ("yes"/"no"), involvedDescription,
//       anonymous ("yes"/"no") - only permanent student accounts can choose;
//       guest reports are always anonymous.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$user = require_user();

$role = input('reporterRole');
$category = input('category');
$location = input('location');
$date = input('incidentDate');
$description = input('description');
$involvedKnown = input('involvedKnown') === 'yes';
$involved = input('involvedDescription');

if (!in_array($role, REPORTER_ROLES, true)) json_error('Tell us if you were the one bullied, a witness, or other.');
if (!in_array($category, REPORT_CATEGORIES, true)) json_error('Choose what kind of bullying happened.');
if ($category === 'Other') {
    $other = input('categoryOther');
    if ($other === '' || too_long($other, 80)) json_error('Describe the kind of bullying in a few words.');
    $category = 'Other: ' . $other;
}
if (!in_array($location, REPORT_LOCATIONS, true)) json_error('Choose where it happened.');
if ($location === 'Other') {
    $other = input('locationOther');
    if ($other === '' || too_long($other, 120)) json_error('Type where it happened.');
    $location = 'Other: ' . $other;
}

$day = DateTime::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Manila'));
$today = new DateTime('today', new DateTimeZone('Asia/Manila'));
if (!$day || $day->format('Y-m-d') !== $date) json_error('Choose the date it happened.');
if ($day > $today) json_error("The date can't be in the future.");

if (mb_strlen($description) < 10) json_error('Describe what happened (at least a sentence).');
if (too_long($description, 5000)) json_error('The description is too long. Keep it under 5,000 characters.');
if ($involvedKnown && ($involved === '' || too_long($involved, 1000))) json_error('Describe the person or people involved.');

// Guests are always anonymous. Students choose.
$anonymous = $user['account_type'] === 'guest' ? true : input('anonymous') === 'yes';

$stmt = db()->prepare(
    'INSERT INTO reports (user_id, is_anonymous, reporter_role, category, report_location, incident_date,
                          report_description, involved_person_known, involved_person_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING report_no'
);
$stmt->bindValue(1, $user['user_id'], PDO::PARAM_INT);
$stmt->bindValue(2, $anonymous, PDO::PARAM_BOOL);
$stmt->bindValue(3, $role);
$stmt->bindValue(4, $category);
$stmt->bindValue(5, $location);
$stmt->bindValue(6, $date);
$stmt->bindValue(7, $description);
$stmt->bindValue(8, $involvedKnown, PDO::PARAM_BOOL);
$stmt->bindValue(9, $involvedKnown ? $involved : null, $involvedKnown ? PDO::PARAM_STR : PDO::PARAM_NULL);
$stmt->execute();
$reportNo = (int) $stmt->fetchColumn();

json_success('Report sent. The guidance office will review it.', ['reportNo' => $reportNo]);
