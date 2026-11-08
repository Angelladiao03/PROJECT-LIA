<?php
// Staff: activity logs on My Account (read from the audit log, which is never edited or deleted).
//
// GET ?scope=mine     -> your own actions (every staff role)
// GET ?scope=all      -> every staff member's actions (Guidance Counselor only)
//     days   = 7 | 30 | 90 | 0 (0 = all time; default 30)
//     type   = reports | messages | students | registration | sos | account (optional)
//     staff  = admin id (optional, scope=all only)
//     page   = 1, 2, ... (25 per page), or 0 for every matching entry (for printing, up to 2,000)
//   -> { entries: [{ at, action, what, staffName, staffRole, item, details }], page, pages, total,
//        previousSignIn (scope=mine), staff: [{ adminId, name, role }] (scope=all) }
//
// GET ?scope=summary&days=30 -> one row per staff member: number of actions, report updates, resolved
//     reports, replies sent, last sign-in (Guidance Counselor and Principal). Totals only, no case details.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');
$admin = require_admin();
$role = $admin['staff_role'];
$myId = (int) $admin['admin_id'];

const PER_PAGE = 25;
const PRINT_LIMIT = 2000;
// Which actions each "type" choice includes
const ACTIVITY_TYPES = [
    'reports' => "(l.action LIKE 'report.%' OR l.action LIKE 'chat.%')",
    'messages' => "(l.action LIKE 'message.%' OR l.action LIKE 'staff_message.%')",
    'students' => "l.action = 'student.view_info'",
    'registration' => "l.action LIKE 'account.%'",
    'sos' => "l.action LIKE 'sos.%'",
    'account' => "l.action LIKE 'staff.%'",
];

$scope = (string) ($_GET['scope'] ?? 'mine');
if (!in_array($scope, ['mine', 'all', 'summary'], true)) json_error('Choose which activity to show.');
if ($scope === 'all' && $role !== 'counselor') json_error('Only the Guidance Counselor can view the activity of all staff.', 403);
if ($scope === 'summary' && !in_array($role, ['counselor', 'principal'], true)) json_error('Only the Guidance Counselor and the Principal can view the staff summary.', 403);

$days = (string) ($_GET['days'] ?? '30');
if (!in_array($days, ['7', '30', '90', '0'], true)) json_error('Choose a period from the list.');
// Start of the period, or null for all time
$since = $days === '0' ? null : (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify("-$days days")->format('Y-m-d H:i:sP');

// ----- Summary: one row per staff member -----
if ($scope === 'summary') {
    $stmt = db()->prepare(
        "SELECT a.admin_id, a.admin_fullname, a.staff_role, a.grade_level,
                COUNT(l.log_id) AS actions,
                COUNT(l.log_id) FILTER (WHERE l.action LIKE 'report.%') AS report_updates,
                COUNT(l.log_id) FILTER (WHERE l.action = 'report.resolve') AS resolved,
                (SELECT COUNT(*) FROM messages m WHERE m.admin_id = a.admin_id AND m.sender_type = 'Admin'
                   AND (CAST(? AS TIMESTAMPTZ) IS NULL OR (m.sent_datetime AT TIME ZONE 'UTC') >= CAST(? AS TIMESTAMPTZ))) AS replies,
                (SELECT MAX(s.created_at) FROM audit_log s WHERE s.admin_id = a.admin_id AND s.action = 'staff.sign_in') AS last_sign_in
         FROM admin_profile a
         LEFT JOIN audit_log l ON l.admin_id = a.admin_id AND (CAST(? AS TIMESTAMPTZ) IS NULL OR l.created_at >= CAST(? AS TIMESTAMPTZ))
         GROUP BY a.admin_id
         ORDER BY CASE a.staff_role WHEN 'counselor' THEN 1 WHEN 'advocate' THEN 2 WHEN 'principal' THEN 3 ELSE 4 END,
                  a.grade_level NULLS FIRST, a.admin_fullname"
    );
    $stmt->execute([$since, $since, $since, $since]);
    send_json(['success' => true, 'staff' => array_map(fn ($s) => [
        'adminId' => (int) $s['admin_id'],
        'name' => $s['admin_fullname'],
        'role' => staff_role_label($s),
        'actions' => (int) $s['actions'],
        'reportUpdates' => (int) $s['report_updates'],
        'resolved' => (int) $s['resolved'],
        'replies' => (int) $s['replies'],
        'lastSignIn' => $s['last_sign_in'],
    ], $stmt->fetchAll())]);
}

// ----- The log: your own actions, or everyone's (counselor) -----
$where = 'TRUE';
$params = [];
if ($scope === 'mine') {
    $where .= ' AND l.admin_id = ?';
    $params[] = $myId;
} elseif (($_GET['staff'] ?? '') !== '') {
    $staffId = positive_int((string) $_GET['staff']);
    if ($staffId === null) json_error('Choose a staff member from the list.');
    $where .= ' AND l.admin_id = ?';
    $params[] = $staffId;
}
if ($since !== null) {
    $where .= ' AND l.created_at >= CAST(? AS TIMESTAMPTZ)';
    $params[] = $since;
}
$type = (string) ($_GET['type'] ?? '');
if ($type !== '') {
    if (!isset(ACTIVITY_TYPES[$type])) json_error('Choose a type of activity from the list.');
    $where .= ' AND ' . ACTIVITY_TYPES[$type];
}

$count = db()->prepare("SELECT COUNT(*) FROM audit_log l WHERE $where");
$count->execute($params);
$total = (int) $count->fetchColumn();

$pageParam = (string) ($_GET['page'] ?? '1');
$page = $pageParam === '0' ? 0 : (positive_int($pageParam) ?? 1); // 0 = everything (for printing)
$pages = max(1, (int) ceil($total / PER_PAGE));
if ($page > $pages) $page = $pages;
$limit = $page === 0 ? PRINT_LIMIT : PER_PAGE;
$offset = $page === 0 ? 0 : ($page - 1) * PER_PAGE;

$stmt = db()->prepare(
    "SELECT l.action, l.target_type, l.target_id, l.details, l.created_at,
            a.admin_fullname, a.staff_role, a.grade_level, r.case_id
     FROM audit_log l
     LEFT JOIN admin_profile a ON a.admin_id = l.admin_id
     LEFT JOIN reports r ON l.target_type = 'report' AND r.report_no = l.target_id
     WHERE $where
     ORDER BY l.created_at DESC, l.log_id DESC
     LIMIT $limit OFFSET $offset"
);
$stmt->execute($params);

// What the action was done to, in words (never a student's name)
function activity_item(array $l): string
{
    return match ($l['target_type']) {
        'report' => 'Report #' . ($l['case_id'] ?? $l['target_id']),
        'sos' => 'SOS alert #' . $l['target_id'],
        'activation' => 'Registration request #' . $l['target_id'],
        'message' => 'Message to a student',
        'staff_message' => 'Staff chat message',
        'user' => 'Student account',
        'staff' => 'Own account',
        default => '',
    };
}

$out = [
    'success' => true,
    'entries' => array_map(fn ($l) => [
        'at' => $l['created_at'],
        'action' => $l['action'],
        'what' => audit_label($l['action']),
        'staffName' => $l['admin_fullname'] ?? 'Unknown staff',
        'staffRole' => $l['staff_role'] ? staff_role_label($l) : '',
        'item' => activity_item($l),
        'details' => (string) ($l['details'] ?? ''),
    ], $stmt->fetchAll()),
    'page' => $page,
    'pages' => $pages,
    'total' => $total,
];

if ($scope === 'mine') {
    // The sign-in before this one (so staff can notice a sign-in that was not theirs)
    $s = db()->prepare("SELECT created_at FROM audit_log WHERE admin_id = ? AND action = 'staff.sign_in' ORDER BY created_at DESC, log_id DESC OFFSET 1 LIMIT 1");
    $s->execute([$myId]);
    $out['previousSignIn'] = $s->fetchColumn() ?: null;
} else {
    $out['staff'] = array_map(fn ($a) => ['adminId' => (int) $a['admin_id'], 'name' => $a['admin_fullname'], 'role' => staff_role_label($a)],
        db()->query('SELECT admin_id, admin_fullname, staff_role, grade_level FROM admin_profile ORDER BY admin_fullname')->fetchAll());
}
send_json($out);
