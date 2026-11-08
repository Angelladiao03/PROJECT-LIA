<?php
// Staff: numbers for the Dashboard (Guidance Counselor and Principal).
// Only totals are sent: no names, no descriptions, so the principal sees insights, not case details.
//
// GET  (every parameter is optional)
//   from, to   the period, as Philippine dates YYYY-MM-DD (default: the last 6 months, up to today)
//   group      day | month | year: how the trend chart groups the reports (default: month)
//   grade      7-12, or "none"           category   e.g. "Cyberbullying" or "Other"
//   location   e.g. "Canteen" or "Other"  status     e.g. "Resolved"
//   role       victim | witness | other, or "none"
//   compare=1  also count the period of the same length just before it
//
// -> { tiles (right now, not affected by the filters), period, summary: { current, previous },
//      trend: [{ key: "2026-11", n, prev }], byLocation / byCategory / byGrade / byRole / byStatus / byWeekday:
//      [[name, n, prev]], options (choices for the filters), recentSos }
// "prev" is only filled in when compare=1.
//
// Reports are counted by the date they were submitted (Philippine time).

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');
$admin = require_admin('counselor', 'principal');

const REPORT_STATUSES = ['Pending', 'Active', 'Under Investigation', 'For Intervention', 'For Referral', 'Resolved', 'Rejected'];
const IN_PROGRESS = "('Active', 'Under Investigation', 'For Intervention', 'For Referral')";
const MAX_BUCKETS = 400; // e.g. no more than about a year shown day by day

$tz = new DateTimeZone('Asia/Manila');
$today = new DateTimeImmutable('today', $tz);
$q = fn (string $name) => trim((string) ($_GET[$name] ?? ''));

// ----- The period -----
$readDate = function (string $name, DateTimeImmutable $default) use ($q, $tz): DateTimeImmutable {
    $value = $q($name);
    if ($value === '') return $default;
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $tz);
    if (!$d || $d->format('Y-m-d') !== $value) json_error('Choose a valid date.');
    return $d;
};
$group = $q('group') ?: 'month';
if (!in_array($group, ['day', 'month', 'year'], true)) json_error('Choose Day, Month or Year.');
$to = min($readDate('to', $today), $today); // no future dates
$from = $readDate('from', $today->modify('first day of this month')->modify('-5 months'));
if ($from > $to) json_error('The start date must be on or before the end date.');

// Goes back $n days, months or years (Mar 31 minus 1 month = Feb 28/29, not Mar 3)
function shift_back(DateTimeImmutable $d, int $n, string $unit): DateTimeImmutable
{
    if ($unit === 'day') return $d->modify("-$n day");
    $first = $d->modify('first day of this month')->modify('-' . ($unit === 'year' ? 12 * $n : $n) . ' month');
    return $first->setDate((int) $first->format('Y'), (int) $first->format('n'), min((int) $d->format('j'), (int) $first->format('t')));
}

// The bars of the trend chart: one per day, month or year in the period
$keyFormat = ['day' => 'Y-m-d', 'month' => 'Y-m', 'year' => 'Y'][$group];
$sqlFormat = ['day' => 'YYYY-MM-DD', 'month' => 'YYYY-MM', 'year' => 'YYYY'][$group];
$firstBucket = match ($group) {
    'day' => $from,
    'month' => $from->modify('first day of this month'),
    'year' => $from->setDate((int) $from->format('Y'), 1, 1),
};
$buckets = [];
for ($d = $firstBucket; $d <= $to; $d = $d->modify("+1 $group")) {
    $buckets[] = $d;
    if (count($buckets) > MAX_BUCKETS) json_error('That period is too long to show day by day. Choose Month or Year.');
}
$n = count($buckets);

// Comparison: the same number of days/months/years just before the period
$compare = $q('compare') === '1';
$prevFrom = shift_back($from, $n, $group);
$prevTo = $from->modify('-1 day');

// ----- Filters (they apply to every report number below, not to the live tiles) -----
// "Other: ..." answers are counted together as "Other"
$norm = fn (string $column) => "CASE WHEN $column LIKE 'Other: %' THEN 'Other' ELSE COALESCE($column, 'Not given') END";
$where = '';
$params = [];
$grade = $q('grade');
if ($grade === 'none') {
    $where .= ' AND r.grade_level IS NULL';
} elseif ($grade !== '') {
    $g = positive_int($grade);
    if (!in_array($g, GRADE_LEVELS, true)) json_error('Choose a grade level from the list.');
    $where .= ' AND r.grade_level = ?';
    $params[] = $g;
}
foreach (['category' => 'r.category', 'location' => 'r.report_location'] as $name => $column) {
    $value = $q($name);
    if ($value === '') continue;
    if (too_long($value, 255)) json_error('Choose a ' . $name . ' from the list.');
    $where .= ' AND ' . $norm($column) . ' = ?';
    $params[] = $value;
}
$status = $q('status');
if ($status !== '') {
    if (!in_array($status, REPORT_STATUSES, true)) json_error('Choose a status from the list.');
    $where .= ' AND r.report_status = ?';
    $params[] = $status;
}
$role = $q('role');
if ($role === 'none') {
    $where .= ' AND r.reporter_role IS NULL';
} elseif ($role !== '') {
    if (!in_array($role, REPORTER_ROLES, true)) json_error('Choose a reporter type from the list.');
    $where .= ' AND r.reporter_role = ?';
    $params[] = $role;
}

// The submitted date in Philippine time (stored in UTC)
const LOCAL = "((r.report_datetime AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')";

// Runs $select over the filtered reports of one period
$inPeriod = function (string $select, DateTimeImmutable $a, DateTimeImmutable $b, string $groupBy = '') use ($where, $params) {
    $stmt = db()->prepare(
        "SELECT $select FROM reports r
         WHERE " . LOCAL . " >= CAST(? AS DATE) AND " . LOCAL . " < CAST(? AS DATE) + 1 $where $groupBy"
    );
    $stmt->execute([$a->format('Y-m-d'), $b->format('Y-m-d'), ...$params]);
    return $stmt;
};

// Totals of one period
$summary = function (DateTimeImmutable $a, DateTimeImmutable $b) use ($inPeriod): array {
    $s = $inPeriod(
        "COUNT(*) AS reports,
         COUNT(*) FILTER (WHERE r.report_status = 'Pending') AS pending,
         COUNT(*) FILTER (WHERE r.report_status IN " . IN_PROGRESS . ") AS in_progress,
         COUNT(*) FILTER (WHERE r.report_status = 'Resolved') AS resolved,
         COUNT(*) FILTER (WHERE r.report_status = 'Rejected') AS rejected,
         COUNT(*) FILTER (WHERE r.is_anonymous) AS anonymous,
         AVG(EXTRACT(EPOCH FROM (r.finished_at - (r.report_datetime AT TIME ZONE 'UTC'))) / 86400)
             FILTER (WHERE r.report_status = 'Resolved' AND r.finished_at IS NOT NULL) AS avg_days",
        $a, $b
    )->fetch();
    // SOS alerts are counted by date only (they have no grade, category or status)
    $sos = db()->prepare(
        "SELECT COUNT(*) FROM sos_alerts
         WHERE ((sos_datetime AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila') >= CAST(? AS DATE)
           AND ((sos_datetime AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila') < CAST(? AS DATE) + 1"
    );
    $sos->execute([$a->format('Y-m-d'), $b->format('Y-m-d')]);
    return [
        'from' => $a->format('Y-m-d'),
        'to' => $b->format('Y-m-d'),
        'reports' => (int) $s['reports'],
        'pending' => (int) $s['pending'],
        'inProgress' => (int) $s['in_progress'],
        'resolved' => (int) $s['resolved'],
        'rejected' => (int) $s['rejected'],
        'anonymous' => (int) $s['anonymous'],
        'avgDaysToResolve' => $s['avg_days'] !== null ? round((float) $s['avg_days'], 1) : null,
        'sos' => (int) $sos->fetchColumn(),
    ];
};

// Counts per value of $expr, this period and (when comparing) the period before.
// Returns [[name, n, prev], ...]. $order: fixed order of names (else: most reports first).
$breakdown = function (string $expr, ?array $order = null) use ($inPeriod, $from, $to, $prevFrom, $prevTo, $compare): array {
    $now = $inPeriod("$expr AS k, COUNT(*) AS n", $from, $to, 'GROUP BY 1')->fetchAll(PDO::FETCH_KEY_PAIR);
    $before = $compare ? $inPeriod("$expr AS k, COUNT(*) AS n", $prevFrom, $prevTo, 'GROUP BY 1')->fetchAll(PDO::FETCH_KEY_PAIR) : [];
    $keys = array_unique(array_merge(array_map('strval', array_keys($now)), array_map('strval', array_keys($before))));
    $rows = array_map(fn ($k) => [$k, (int) ($now[$k] ?? 0), $compare ? (int) ($before[$k] ?? 0) : null], $keys);
    if ($order !== null) {
        $pos = array_flip($order);
        usort($rows, fn ($x, $y) => ($pos[$x[0]] ?? 99) <=> ($pos[$y[0]] ?? 99));
    } else {
        usort($rows, fn ($x, $y) => [$y[1], $y[2], $x[0]] <=> [$x[1], $x[2], $y[0]]);
    }
    return $rows;
};

// ----- Trend -----
$trendNow = $inPeriod("TO_CHAR(" . LOCAL . ", '$sqlFormat') AS k, COUNT(*) AS n", $from, $to, 'GROUP BY 1')->fetchAll(PDO::FETCH_KEY_PAIR);
$trendBefore = $compare ? $inPeriod("TO_CHAR(" . LOCAL . ", '$sqlFormat') AS k, COUNT(*) AS n", $prevFrom, $prevTo, 'GROUP BY 1')->fetchAll(PDO::FETCH_KEY_PAIR) : [];
$trend = array_map(function (DateTimeImmutable $d) use ($trendNow, $trendBefore, $compare, $n, $group, $keyFormat) {
    $prevKey = shift_back($d, $n, $group)->format($keyFormat);
    return [
        'key' => $d->format($keyFormat),
        'n' => (int) ($trendNow[$d->format($keyFormat)] ?? 0),
        'prevKey' => $compare ? $prevKey : null,
        'prev' => $compare ? (int) ($trendBefore[$prevKey] ?? 0) : null,
    ];
}, $buckets);

// ----- Choices for the filters: the fixed lists, plus any older values found in the reports -----
$found = fn (string $column) => db()->query('SELECT DISTINCT ' . $norm($column) . ' FROM reports r')->fetchAll(PDO::FETCH_COLUMN);
$options = [
    'categories' => array_values(array_unique(array_merge(REPORT_CATEGORIES, $found('r.category')))),
    'locations' => array_values(array_unique(array_merge(report_locations(), $found('r.report_location')))),
    'grades' => GRADE_LEVELS,
    'statuses' => REPORT_STATUSES,
    'roles' => REPORTER_ROLES,
    'firstReport' => db()->query('SELECT TO_CHAR(MIN(' . LOCAL . "), 'YYYY-MM-DD') FROM reports r")->fetchColumn() ?: null,
];

$one = fn (string $sql) => (int) db()->query($sql)->fetchColumn();
$sos = db()->query('SELECT sos_datetime, sos_location, sos_status FROM sos_alerts ORDER BY sos_datetime DESC LIMIT 5')->fetchAll();

send_json([
    'success' => true,
    // Right now (every report, not affected by the period or filters)
    'tiles' => [
        'activeSos' => $one("SELECT COUNT(*) FROM sos_alerts WHERE sos_status = 'Active'"),
        'pendingAccounts' => $admin['staff_role'] === 'counselor' ? $one("SELECT COUNT(*) FROM activation_requests WHERE status = 'Pending'") : null,
        'total' => $one('SELECT COUNT(*) FROM reports'),
        'pending' => $one("SELECT COUNT(*) FROM reports WHERE report_status = 'Pending' AND archived_at IS NULL"),
        'investigating' => $one('SELECT COUNT(*) FROM reports WHERE report_status IN ' . IN_PROGRESS . ' AND archived_at IS NULL'),
        'resolved' => $one("SELECT COUNT(*) FROM reports WHERE report_status = 'Resolved'"),
    ],
    'period' => [
        'from' => $from->format('Y-m-d'),
        'to' => $to->format('Y-m-d'),
        'group' => $group,
        'compare' => $compare,
        'prevFrom' => $compare ? $prevFrom->format('Y-m-d') : null,
        'prevTo' => $compare ? $prevTo->format('Y-m-d') : null,
    ],
    'summary' => [
        'current' => $summary($from, $to),
        'previous' => $compare ? $summary($prevFrom, $prevTo) : null,
    ],
    'trend' => $trend,
    'byLocation' => $breakdown($norm('r.report_location')),
    'byCategory' => $breakdown($norm('r.category')),
    'byGrade' => $breakdown("COALESCE('Grade ' || r.grade_level, 'Not given')", [...array_map(fn ($g) => "Grade $g", GRADE_LEVELS), 'Not given']),
    'byRole' => $breakdown("COALESCE(r.reporter_role, 'Not given')", [...REPORTER_ROLES, 'Not given']),
    'byStatus' => $breakdown('r.report_status', REPORT_STATUSES),
    // Day of the week the incident happened (1 = Monday ... 7 = Sunday), from the date on the report
    'byWeekday' => $breakdown("COALESCE(EXTRACT(ISODOW FROM r.incident_date)::INT::TEXT, 'Not given')", ['1', '2', '3', '4', '5', '6', '7', 'Not given']),
    'options' => $options,
    'recentSos' => array_map(fn ($a) => ['sentAt' => $a['sos_datetime'], 'location' => $a['sos_location'], 'status' => $a['sos_status']], $sos),
]);
