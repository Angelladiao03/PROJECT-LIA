<?php
// Admin New Requests / Active Tracking / Report Records pages + SOS alerts.
// Replaces AdminReportServlet.java.
//
// GET              -> all reports with student info (the page filters by status)
// GET ?type=sos    -> all SOS alerts
//
// POST action=approve&reportNo=..      Pending -> Active
// POST action=investigate&reportNo=..  Active -> Under Investigation
// POST action=resolve&reportNo=..      -> Resolved
// POST action=reject&reportNo=..       deletes the report (same as the Java
//                                      version; to be changed to "Rejected"
//                                      + archive - see CLAUDE.md)
// POST action=dispatch&sosNo=..        Active -> Dispatched
// POST action=respond&sosNo=..         -> Responded

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('GET', 'POST');
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['type'] ?? '') === 'sos') {
        $rows = db()->query(
            'SELECT a.sos_no, a.student_lrn, s.student_fullName AS full_name,
                    s.student_username, a.sos_location, a.sos_description,
                    a.sos_datetime, a.sos_status
             FROM sos_alerts a JOIN students s ON s.student_lrn = a.student_lrn
             ORDER BY a.sos_datetime DESC'
        )->fetchAll();

        send_json(rows_as_text($rows, [
            'sosNo' => 'sos_no',
            'lrn' => 'student_lrn',
            'fullName' => 'full_name',
            'username' => 'student_username',
            'location' => 'sos_location',
            'description' => 'sos_description',
            'dateTime' => 'sos_datetime',
            'status' => 'sos_status',
        ]));
    }

    $rows = db()->query(
        'SELECT r.report_no, r.is_anonymous, r.student_lrn, s.student_fullName AS full_name,
                s.student_username, s.grade_section, s.adviser_name, s.email, s.contact_number,
                r.category, r.report_description, r.report_location,
                r.involved_person_known, r.involved_person_description,
                r.report_datetime, r.report_status
         FROM reports r LEFT JOIN students s ON s.student_lrn = r.student_lrn
         ORDER BY r.report_datetime DESC'
    )->fetchAll();

    $reports = [];
    foreach ($rows as $r) {
        $anon = (bool) $r['is_anonymous'];
        // Anonymous reports: never send the student's details to the browser.
        $reports[] = [
            'reportNo' => as_text($r['report_no']),
            'isAnonymous' => $anon ? 'true' : 'false',
            'lrn' => $anon ? '' : as_text($r['student_lrn']),
            'fullName' => $anon ? 'Anonymous Student' : as_text($r['full_name']),
            'username' => $anon ? 'Anonymous' : as_text($r['student_username']),
            'gradeSection' => $anon ? '' : as_text($r['grade_section']),
            'adviser' => $anon ? '' : as_text($r['adviser_name']),
            'email' => $anon ? '' : as_text($r['email']),
            'contactNumber' => $anon ? '' : as_text($r['contact_number']),
            'category' => as_text($r['category']),
            'description' => as_text($r['report_description']),
            'location' => as_text($r['report_location']),
            'involvedPersonKnown' => as_text((bool) $r['involved_person_known']),
            'involvedPersonDescription' => as_text($r['involved_person_description']),
            'dateTime' => as_text($r['report_datetime']),
            'status' => as_text($r['report_status']),
        ];
    }
    send_json($reports);
}

// POST
$action = post('action');
if ($action === null) json_error('Missing action.');

function require_number(string $field): int
{
    $value = post($field);
    if ($value === null || !ctype_digit($value)) {
        json_error("Missing or invalid $field.");
    }
    return (int) $value;
}

function update_report_status(int $reportNo, string $status): bool
{
    $stmt = db()->prepare('UPDATE reports SET report_status = ? WHERE report_no = ?');
    $stmt->execute([$status, $reportNo]);
    return $stmt->rowCount() === 1;
}

function update_sos_status(int $sosNo, string $status): bool
{
    $stmt = db()->prepare('UPDATE sos_alerts SET sos_status = ? WHERE sos_no = ?');
    $stmt->execute([$status, $sosNo]);
    return $stmt->rowCount() === 1;
}

switch ($action) {
    case 'approve':
        $ok = update_report_status(require_number('reportNo'), 'Active');
        break;
    case 'investigate':
        $ok = update_report_status(require_number('reportNo'), 'Under Investigation');
        break;
    case 'resolve':
        $ok = update_report_status(require_number('reportNo'), 'Resolved');
        break;
    case 'reject':
        $stmt = db()->prepare('DELETE FROM reports WHERE report_no = ?');
        $stmt->execute([require_number('reportNo')]);
        $ok = $stmt->rowCount() === 1;
        break;
    case 'dispatch':
        $ok = update_sos_status(require_number('sosNo'), 'Dispatched');
        break;
    case 'respond':
        $ok = update_sos_status(require_number('sosNo'), 'Responded');
        break;
    default:
        json_error('Unknown action: ' . $action);
}

$ok ? json_success('Done.') : json_error('Update failed.');
