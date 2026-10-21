<?php
// The signed-in person's own reports, newest first.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');
$user = require_user();

$stmt = db()->prepare(
    'SELECT report_no, is_anonymous, reporter_role, category, report_location, incident_date,
            report_description, report_status, reject_reason, report_datetime, updated_at
     FROM reports WHERE user_id = ? ORDER BY report_datetime DESC'
);
$stmt->execute([$user['user_id']]);

$reports = array_map(fn ($r) => [
    'reportNo' => (int) $r['report_no'],
    'anonymous' => (bool) $r['is_anonymous'],
    'reporterRole' => $r['reporter_role'],
    'category' => $r['category'],
    'location' => $r['report_location'],
    'incidentDate' => $r['incident_date'],
    'description' => $r['report_description'],
    'status' => $r['report_status'],
    'rejectReason' => $r['reject_reason'],
    'submittedAt' => $r['report_datetime'],
    'updatedAt' => $r['updated_at'],
], $stmt->fetchAll());

send_json(['success' => true, 'reports' => $reports]);
