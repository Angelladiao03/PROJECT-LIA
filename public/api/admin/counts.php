<?php
// Staff: the small numbers in the side menu and the red SOS strip, checked every 20 seconds.
// One small request instead of downloading every report, alert, request and chat each time.
//
// GET -> { activeSos: [{ sosNo, name, location, sentAt }], newReports, pendingAccounts, waitingChats, staffUnread }
// Advocates: counts for their grade level (SOS alerts are for everyone).
// Principal and security: only staffUnread (unread messages from other staff).

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');
$admin = require_admin();
$grade = staff_grade($admin);

// Unread messages from other staff (staff chat), for every role
$stmt = db()->prepare('SELECT COUNT(*) FROM staff_messages WHERE to_admin_id = ? AND read_at IS NULL AND deleted_at IS NULL');
$stmt->execute([$admin['admin_id']]);
$staffUnread = (int) $stmt->fetchColumn();

if (!in_array($admin['staff_role'], ['counselor', 'advocate'], true)) {
    send_json(['success' => true, 'activeSos' => [], 'newReports' => 0, 'pendingAccounts' => 0, 'waitingChats' => 0, 'staffUnread' => $staffUnread]);
}

$count = function (string $sql) use ($grade): int {
    $stmt = db()->prepare($sql);
    $stmt->execute(array_fill(0, substr_count($sql, '?'), $grade));
    return (int) $stmt->fetchColumn();
};

$sos = db()->query(
    "SELECT a.sos_no, a.sos_location, a.sos_datetime, u.account_type, u.guest_id, u.full_name
     FROM sos_alerts a LEFT JOIN users u ON u.user_id = a.user_id
     WHERE a.sos_status = 'Active' ORDER BY a.sos_datetime DESC"
)->fetchAll();

send_json([
    'success' => true,
    'activeSos' => array_map(fn ($a) => [
        'sosNo' => (int) $a['sos_no'],
        'name' => $a['account_type'] ? display_name($a) : 'Unknown',
        'location' => $a['sos_location'],
        'sentAt' => $a['sos_datetime'],
    ], $sos),
    'newReports' => $count("SELECT COUNT(*) FROM reports WHERE report_status = 'Pending' AND (CAST(? AS INT) IS NULL OR grade_level = CAST(? AS INT))"),
    'pendingAccounts' => $count("SELECT COUNT(*) FROM activation_requests WHERE status = 'Pending' AND (CAST(? AS INT) IS NULL OR grade_level = CAST(? AS INT))"),
    // chats whose newest message is from the student (waiting for a reply)
    'waitingChats' => $count(
        "SELECT COUNT(*) FROM (
             SELECT DISTINCT ON (m.user_id, m.case_no) m.sender_type, m.deleted_at, m.case_no, u.grade_level AS user_grade, r.grade_level AS case_grade
             FROM messages m JOIN users u ON u.user_id = m.user_id LEFT JOIN reports r ON r.report_no = m.case_no
             ORDER BY m.user_id, m.case_no, m.sent_datetime DESC, m.message_id DESC
         ) last
         WHERE last.sender_type = 'Student' AND last.deleted_at IS NULL
           AND (CAST(? AS INT) IS NULL OR (CASE WHEN last.case_no IS NULL THEN last.user_grade ELSE last.case_grade END) = CAST(? AS INT))"
    ),
    'staffUnread' => $staffUnread,
]);
