<?php
// Submit an incident report. Replaces ReportServlet.java.
// POST: isAnonymous ("true"/"false"), location, category, description,
//       involvedPersonKnown ("true"/"false"), involvedPersonDescription
//
// NOTE (to decide as a group): like the Java version, an anonymous report
// sent while logged in is still linked to the student's LRN - is_anonymous
// only hides the name from staff. See CLAUDE.md "Anonymity must be accurate".

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');

$isAnonymous = strcasecmp(post('isAnonymous') ?? '', 'true') === 0;
$location = post('location');
$category = post('category');
$description = post('description');
$involvedPersonKnown = strcasecmp(post('involvedPersonKnown') ?? '', 'true') === 0;
$involvedPersonDescription = post('involvedPersonDescription');

if (is_blank($location) || is_blank($category) || is_blank($description)) {
    json_error('Please fill out location, category, and description.');
}
if ($involvedPersonKnown && is_blank($involvedPersonDescription)) {
    json_error('Please describe the person(s) involved.');
}

$lrn = current_student_lrn();
if (!$isAnonymous && $lrn === null) {
    json_error('You must be logged in to submit a non-anonymous report.');
}

$stmt = db()->prepare(
    'INSERT INTO reports
        (student_lrn, is_anonymous, report_location, category, report_description,
         involved_person_known, involved_person_description)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING report_no'
);
$stmt->bindValue(1, $lrn, $lrn === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
$stmt->bindValue(2, $isAnonymous, PDO::PARAM_BOOL);
$stmt->bindValue(3, $location);
$stmt->bindValue(4, $category);
$stmt->bindValue(5, $description);
$stmt->bindValue(6, $involvedPersonKnown, PDO::PARAM_BOOL);
$stmt->bindValue(7, $involvedPersonKnown ? $involvedPersonDescription : null,
    $involvedPersonKnown ? PDO::PARAM_STR : PDO::PARAM_NULL);
$stmt->execute();
$reportNo = $stmt->fetchColumn();

json_success('Report submitted. Please wait for status updates.', [
    'reportNo' => as_text($reportNo),
]);
