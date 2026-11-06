<?php
// Staff: incident reports.
//
// GET -> the reports this staff member may see (newest first). The page filters by status.
//        Counselor: every report. Advocate: only reports of their grade level.
//        Only the reporter's NAME is included. Their other details (and the phone number of an
//        anonymous reporter) come from admin/student.php after the staff member re-enters their password.
//
// POST action=approve     reportNo   Pending -> Active
// POST action=investigate reportNo   Active -> Under Investigation
// POST action=intervene   reportNo   -> For Intervention (the school handles it: counseling, meetings, etc.)
// POST action=refer       reportNo, agency (from public/assets/referrals.json, or "Other" + agencyOther),
//                         note (optional)   -> For Referral (sent to an outside office)
// POST action=resolve     reportNo   -> Resolved
// POST action=reject      reportNo, reason   -> Rejected (the student sees the reason)
// POST action=archive     reportNo   hides a Resolved/Rejected report from Records (never deleted)
// POST action=unarchive   reportNo
// GET  ?history=N            who did what to report N, and when (audit log)
//
// Every change is written to the audit log with the staff member's name.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin('counselor', 'advocate');

// Stops unless this staff member may see report N (advocates: only their grade level). Returns the report.
function report_in_scope(array $admin, ?int $reportNo): array
{
    if ($reportNo === null) json_error('Missing report number.');
    $stmt = db()->prepare('SELECT report_status, archived_at, grade_level FROM reports WHERE report_no = ?');
    $stmt->execute([$reportNo]);
    $report = $stmt->fetch();
    if (!$report || !staff_sees_grade($admin, $report['grade_level'])) json_error('That report was not found.', 404);
    return $report;
}

// GET ?history=N -> the case history of one report (from the audit log)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['history'])) {
    $reportNo = positive_int((string) $_GET['history']);
    report_in_scope($admin, $reportNo);
    $stmt = db()->prepare(
        "SELECT l.action, l.details, l.created_at, a.admin_fullname
         FROM audit_log l LEFT JOIN admin_profile a ON a.admin_id = l.admin_id
         WHERE l.target_type = 'report' AND l.target_id = ? ORDER BY l.created_at, l.log_id"
    );
    $stmt->execute([$reportNo]);
    send_json(['success' => true, 'history' => array_map(fn ($h) => [
        'action' => $h['action'],
        'what' => audit_label($h['action']),
        'details' => $h['details'],
        'by' => $h['admin_fullname'] ?? 'Unknown staff',
        'at' => $h['created_at'],
    ], $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $grade = staff_grade($admin); // null = all grade levels
    $stmt = db()->prepare(
        'SELECT r.*, u.account_type, u.guest_id, u.full_name
         FROM reports r LEFT JOIN users u ON u.user_id = r.user_id
         WHERE CAST(? AS INT) IS NULL OR r.grade_level = CAST(? AS INT)
         ORDER BY r.report_datetime DESC'
    );
    $stmt->execute([$grade, $grade]);
    $rows = $stmt->fetchAll();

    $reports = array_map(function ($r) {
        $anonymous = (bool) $r['is_anonymous'];
        return [
            'reportNo' => (int) $r['report_no'],
            'anonymous' => $anonymous,
            'reporter' => $anonymous ? null : [
                'userId' => $r['user_id'] !== null ? (int) $r['user_id'] : null,
                'name' => $r['user_id'] !== null ? display_name($r) : 'Unknown (old record)',
                'accountType' => $r['account_type'],
            ],
            'gradeLevel' => $r['grade_level'] !== null ? (int) $r['grade_level'] : null,
            // Staff can message every report's reporter, anonymous ones too (in that report's case chat).
            'canMessage' => $r['user_id'] !== null,
            'reporterRole' => $r['reporter_role'],
            'category' => $r['category'],
            'location' => $r['report_location'],
            'incidentDate' => $r['incident_date'],
            'description' => $r['report_description'],
            'involvedKnown' => (bool) $r['involved_person_known'],
            'involvedDescription' => $r['involved_person_description'],
            'status' => $r['report_status'],
            'rejectReason' => $r['reject_reason'],
            'referredTo' => $r['referred_to'],      // where a "For Referral" case was sent (staff only)
            'referralNote' => $r['referral_note'],
            'archived' => $r['archived_at'] !== null,
            'submittedAt' => $r['report_datetime'],
            'updatedAt' => $r['updated_at'],
        ];
    }, $rows);

    send_json(['success' => true, 'reports' => $reports]);
}

// ----- POST: change a report -----
$action = input('action');
$reportNo = positive_int(input('reportNo'));
$report = report_in_scope($admin, $reportNo);
$status = $report['report_status'];

// Which status each action needs first, and what it changes to.
$moves = [
    'approve' => [['Pending'], 'Active', 'Report approved and moved to Active.'],
    'investigate' => [['Active'], 'Under Investigation', 'Report moved to Under Investigation.'],
    'intervene' => [['Active', 'Under Investigation', 'For Referral'], 'For Intervention', 'Report moved to For Intervention.'],
    'refer' => [['Active', 'Under Investigation', 'For Intervention'], 'For Referral', 'Report moved to For Referral.'],
    'resolve' => [['Active', 'Under Investigation', 'For Intervention', 'For Referral'], 'Resolved', 'Report marked as Resolved.'],
    'reject' => [['Pending', 'Active'], 'Rejected', 'Report rejected. The student can see your reason.'],
];

if (isset($moves[$action])) {
    [$from, $to, $message] = $moves[$action];
    if (!in_array($status, $from, true)) {
        json_error("This report is already \"$status\", so it can't be changed that way. Reload the page.", 409);
    }
    $reason = null;
    if ($action === 'reject') {
        $reason = input('reason');
        if (mb_strlen($reason) < 5) json_error('Write a short reason the student will see.');
        if (too_long($reason, 1000)) json_error('Keep the reason under 1,000 characters.');
    }
    if ($action === 'refer') {
        // Where the case is referred to: one of the offices in referrals.json, or "Other" (typed in)
        $agency = input('agency');
        if ($agency === 'Other') {
            $agency = input('agencyOther');
            if ($agency === '' || too_long($agency, 150)) json_error('Type the office the case is referred to.');
        } elseif (!in_array($agency, referral_agencies(), true)) {
            json_error('Choose where the case is referred to.');
        }
        $note = input('note');
        if (too_long($note, 1000)) json_error('Keep the note under 1,000 characters.');
        db()->prepare("UPDATE reports SET report_status = 'For Referral', referred_to = ?, referral_note = NULLIF(?, ''), updated_at = NOW() WHERE report_no = ?")
            ->execute([$agency, $note, $reportNo]);
        audit((int) $admin['admin_id'], 'report.refer', 'report', $reportNo, 'Referred to: ' . $agency . ($note !== '' ? " · Note: $note" : ''));
        notify_report_update($reportNo, $action);
        json_success($message);
    }
    db()->prepare('UPDATE reports SET report_status = ?, reject_reason = ?, updated_at = NOW() WHERE report_no = ?')
        ->execute([$to, $reason, $reportNo]);
    audit((int) $admin['admin_id'], 'report.' . $action, 'report', $reportNo, $reason ?? '');
    notify_report_update($reportNo, $action, $reason); // email the student that their report changed
    json_success($message);
}

if ($action === 'archive' || $action === 'unarchive') {
    if (!in_array($status, ['Resolved', 'Rejected'], true)) {
        json_error('Only Resolved or Rejected reports can be archived.', 409);
    }
    db()->prepare('UPDATE reports SET archived_at = ' . ($action === 'archive' ? 'NOW()' : 'NULL') . ', updated_at = NOW() WHERE report_no = ?')
        ->execute([$reportNo]);
    audit((int) $admin['admin_id'], 'report.' . $action, 'report', $reportNo);
    json_success($action === 'archive' ? 'Report archived. It is kept, just hidden from the main list.' : 'Report restored.');
}

json_error('Unknown action.');
