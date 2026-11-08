<?php
// Send an incident report.
// POST: reporterRole (victim | witness | other), category, categoryOther,
//       location, locationOther, incidentDate (YYYY-MM-DD), description,
//       involvedKnown ("yes"/"no"), involvedDescription,
//       anonymous ("yes"/"no") - only permanent student accounts can choose;
//       guest reports are always anonymous.
//       relatedReport (optional) - a follow-up of one of your earlier reports (e.g. the same bullying
//       happened again after the first case was resolved). Only for reports that include your
//       identity, and only to your own earlier Resolved reports that also include your identity.
//       gradeLevel (7-12) - asked on the form when the account has no grade level (guests).
//       Students' reports use the grade level of their account.
// The grade level decides which grade's guidance advocate sees the report (the counselor sees every report).

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

// Checked first because it is the first question on the form for guests
$grade = $user['grade_level'] !== null ? (int) $user['grade_level'] : grade_input('gradeLevel');
if ($grade === null) json_error('Choose your grade level, so the report reaches your grade\'s guidance advocate.');

if (!in_array($role, REPORTER_ROLES, true)) json_error('Please indicate whether you are the victim, a witness, or other.');
if (!in_array($category, REPORT_CATEGORIES, true)) json_error('Choose what kind of bullying happened.');
if ($category === 'Other') {
    $other = input('categoryOther');
    if ($other === '' || too_long($other, 80)) json_error('Describe the kind of bullying in a few words.');
    $category = 'Other: ' . $other;
}
if (!in_array($location, report_locations(), true)) json_error('Choose where it happened.');
if ($location === 'Other') {
    $other = input('locationOther');
    if ($other === '' || too_long($other, 120)) json_error('Type where it happened.');
    $location = 'Other: ' . $other;
}

$day = DateTime::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Manila'));
$today = new DateTime('today', new DateTimeZone('Asia/Manila'));
if (!$day || $day->format('Y-m-d') !== $date) json_error('Choose the date it happened.');
if ($day > $today) json_error('The date cannot be in the future.');

if (mb_strlen($description) < 10) json_error('Describe what happened (at least a sentence).');
if (too_long($description, 5000)) json_error('The description is too long. Keep it under 5,000 characters.');
if ($involvedKnown && ($involved === '' || too_long($involved, 1000))) json_error('Describe the person or people involved.');

// Guests are always anonymous. Students choose.
$anonymous = $user['account_type'] === 'guest' ? true : input('anonymous') === 'yes';

// Follow-up of an earlier report? Only when this report includes the student's identity, and only
// to one of their own earlier Resolved reports that also includes it. (Linking to an anonymous report
// would tell staff who sent it; guests' reports are always anonymous, so guests cannot link.)
$related = null;
if (input('relatedReport') !== '') {
    if ($anonymous) json_error('Only reports that include your identity can be linked to an earlier report. Choose "Include My Identity", or do not link the reports.');
    $related = positive_int(input('relatedReport'));
    $check = db()->prepare('SELECT is_anonymous, report_status FROM reports WHERE report_no = ? AND user_id = ?');
    $check->execute([$related ?? 0, $user['user_id']]);
    $earlier = $check->fetch();
    if (!$earlier) json_error('Choose one of your own earlier reports, or leave the field empty.');
    if ($earlier['is_anonymous']) json_error('The earlier report did not include your identity, so it cannot be linked. Please leave the field empty.');
    if ($earlier['report_status'] !== 'Resolved') json_error('Only a resolved report can be linked as an earlier report.');
}

// The report ID (2026-0001): this year's next number. The lock makes sure two reports sent
// at the same moment never get the same number.
$pdo = db();
$pdo->beginTransaction();
$pdo->query('SELECT pg_advisory_xact_lock(7310001)');
$stmt = $pdo->prepare(
    "INSERT INTO reports (user_id, is_anonymous, reporter_role, category, report_location, incident_date,
                          report_description, involved_person_known, involved_person_description, grade_level,
                          related_report_no, case_year, case_seq)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             EXTRACT(YEAR FROM NOW() AT TIME ZONE 'Asia/Manila')::INT,
             (SELECT COALESCE(MAX(case_seq), 0) + 1 FROM reports
              WHERE case_year = EXTRACT(YEAR FROM NOW() AT TIME ZONE 'Asia/Manila')::INT))
     RETURNING report_no, case_id"
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
$stmt->bindValue(10, $grade, PDO::PARAM_INT);
$stmt->bindValue(11, $related, $related === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
$stmt->execute();
$row = $stmt->fetch();
$pdo->commit();

json_success('Report submitted. The Guidance Office will review it.', ['reportNo' => (int) $row['report_no'], 'caseId' => $row['case_id']]);
