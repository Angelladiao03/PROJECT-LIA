<?php
// The signed-in person's own reports, newest first.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');
$user = require_user();
close_quiet_chats(); // so "chatClosed" below is up to date

$stmt = db()->prepare(
    'SELECT r.report_no, r.case_id, r.is_anonymous, r.reporter_role, r.category, r.report_location, r.incident_date,
            r.report_description, r.report_status, r.reject_reason, r.report_datetime, r.updated_at, r.grade_level,
            r.related_report_no, rel.case_id AS related_case_id, r.chat_closed_at
     FROM reports r LEFT JOIN reports rel ON rel.report_no = r.related_report_no
     WHERE r.user_id = ? ORDER BY r.report_datetime DESC'
);
$stmt->execute([$user['user_id']]);

$reports = array_map(fn ($r) => [
    'reportNo' => (int) $r['report_no'],
    'caseId' => $r['case_id'],
    'relatedReportNo' => $r['related_report_no'] !== null ? (int) $r['related_report_no'] : null,
    'relatedCaseId' => $r['related_case_id'],
    'anonymous' => (bool) $r['is_anonymous'],
    'reporterRole' => $r['reporter_role'],
    'category' => $r['category'],
    'location' => $r['report_location'],
    'incidentDate' => $r['incident_date'],
    'description' => $r['report_description'],
    'status' => $r['report_status'],
    'rejectReason' => $r['reject_reason'],
    'gradeLevel' => $r['grade_level'] !== null ? (int) $r['grade_level'] : null,
    'submittedAt' => $r['report_datetime'],
    'updatedAt' => $r['updated_at'],
    'chatClosed' => $r['chat_closed_at'] !== null, // closed 3 days after the last message (Resolved/Rejected)
], $stmt->fetchAll());

send_json(['success' => true, 'reports' => $reports]);
