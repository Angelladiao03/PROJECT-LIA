<?php
// Staff: SOS alerts.
// GET -> every SOS alert (newest first)
// POST action=dispatch sosNo   Active -> Dispatched (someone is on the way)
// POST action=respond  sosNo   -> Responded (the situation was handled)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = db()->query(
        'SELECT a.*, u.account_type, u.guest_id, u.full_name, u.grade_section, u.contact_number
         FROM sos_alerts a LEFT JOIN users u ON u.user_id = a.user_id
         ORDER BY a.sos_datetime DESC'
    )->fetchAll();

    send_json(['success' => true, 'alerts' => array_map(fn ($a) => [
        'sosNo' => (int) $a['sos_no'],
        'userId' => $a['user_id'] !== null ? (int) $a['user_id'] : null,
        'name' => $a['user_id'] !== null ? display_name($a) : 'Unknown (old record)',
        'gradeSection' => $a['grade_section'],
        'contactNumber' => $a['contact_number'],
        'location' => $a['sos_location'],
        'description' => $a['sos_description'],
        'status' => $a['sos_status'],
        'sentAt' => $a['sos_datetime'],
    ], $rows)]);
}

$action = input('action');
$sosNo = positive_int(input('sosNo'));
if ($sosNo === null) json_error('Missing SOS number.');

$moves = [
    'dispatch' => ['Active', 'Dispatched', 'Marked as Dispatched: someone is on the way.'],
    'respond' => [null, 'Responded', 'Marked as Responded.'],
];
if (!isset($moves[$action])) json_error('Unknown action.');
[$from, $to, $message] = $moves[$action];

$sql = 'UPDATE sos_alerts SET sos_status = ? WHERE sos_no = ? AND sos_status <> ?' . ($from ? ' AND sos_status = ?' : '');
$params = $from ? [$to, $sosNo, $to, $from] : [$to, $sosNo, $to];
$stmt = db()->prepare($sql);
$stmt->execute($params);

$stmt->rowCount() === 1 ? json_success($message) : json_error('This alert was already updated. Reload the page.', 409);
