<?php
// Staff: numbers for the Dashboard (Guidance Counselor and Principal).
// Only totals are sent: no names, no descriptions, so the principal sees insights, not case details.
//
// GET -> { tiles, monthly: [{ month: "2026-10", n }], byLocation, byCategory, byRole, byGrade, recentSos }

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');
$admin = require_admin('counselor', 'principal');

$one = fn (string $sql) => (int) db()->query($sql)->fetchColumn();
// "Other: ..." answers are counted together as "Other"
$tally = fn (string $column) => db()->query(
    "SELECT CASE WHEN $column LIKE 'Other: %' THEN 'Other' ELSE COALESCE($column, 'Not given') END AS k, COUNT(*) AS n
     FROM reports GROUP BY 1 ORDER BY n DESC, k"
)->fetchAll(PDO::FETCH_NUM);

// Reports per month for the last 6 months (Philippine time)
$months = db()->query(
    "SELECT TO_CHAR(report_datetime AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM') AS month, COUNT(*) AS n
     FROM reports
     WHERE report_datetime >= (DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Manila') - INTERVAL '5 months') AT TIME ZONE 'Asia/Manila' AT TIME ZONE 'UTC'
     GROUP BY 1"
)->fetchAll(PDO::FETCH_KEY_PAIR);

$sos = db()->query('SELECT sos_datetime, sos_location, sos_status FROM sos_alerts ORDER BY sos_datetime DESC LIMIT 5')->fetchAll();

send_json([
    'success' => true,
    'tiles' => [
        'activeSos' => $one("SELECT COUNT(*) FROM sos_alerts WHERE sos_status = 'Active'"),
        'pendingAccounts' => $admin['staff_role'] === 'counselor' ? $one("SELECT COUNT(*) FROM activation_requests WHERE status = 'Pending'") : null,
        'total' => $one('SELECT COUNT(*) FROM reports'),
        'pending' => $one("SELECT COUNT(*) FROM reports WHERE report_status = 'Pending' AND archived_at IS NULL"),
        'investigating' => $one("SELECT COUNT(*) FROM reports WHERE report_status IN ('Active', 'Under Investigation', 'For Intervention', 'For Referral') AND archived_at IS NULL"),
        'resolved' => $one("SELECT COUNT(*) FROM reports WHERE report_status = 'Resolved'"),
    ],
    'monthly' => array_map(fn ($k) => ['month' => $k, 'n' => (int) ($months[$k] ?? 0)], array_map(
        fn ($i) => (new DateTime('first day of this month', new DateTimeZone('Asia/Manila')))->modify("-$i month")->format('Y-m'),
        [5, 4, 3, 2, 1, 0]
    )),
    'byLocation' => $tally('report_location'),
    'byCategory' => $tally('category'),
    'byRole' => $tally('reporter_role'),
    'byGrade' => db()->query(
        "SELECT COALESCE('Grade ' || grade_level, 'Not given') AS k, COUNT(*) AS n FROM reports GROUP BY grade_level ORDER BY grade_level NULLS LAST"
    )->fetchAll(PDO::FETCH_NUM),
    'recentSos' => array_map(fn ($a) => ['sentAt' => $a['sos_datetime'], 'location' => $a['sos_location'], 'status' => $a['sos_status']], $sos),
]);
