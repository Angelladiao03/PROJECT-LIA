<?php
// Staff: a student's personal details, shown only after the staff member types their own password.
// (Someone walking past an open staff screen can't read students' details.)
//
// POST action=unlock, password  -> details can be opened for the next 10 minutes
// GET  ?report=N                -> the reporter of report N. Anonymous reports: the contact number only.
// GET  ?user=N                  -> account N (from a general chat)
// Every time details are opened it is written to the audit log.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin('counselor', 'advocate');

const UNLOCK_MINUTES = 10;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (input('action') !== 'unlock') json_error('Unknown action.');
    $password = $_POST['password'] ?? '';
    if (!is_string($password) || $password === '') json_error('Enter your password.');
    $lockKey = 'staff:' . strtolower($admin['admin_username']); // same limit as signing in
    stop_if_locked($lockKey);
    if (!check_password($password, $admin['admin_password'])) {
        record_failed_login($lockKey);
        json_error('Wrong password.', 401);
    }
    clear_failed_logins($lockKey);
    $_SESSION['infoUnlockedUntil'] = time() + UNLOCK_MINUTES * 60;
    json_success('Student details unlocked for ' . UNLOCK_MINUTES . ' minutes.');
}

if (($_SESSION['infoUnlockedUntil'] ?? 0) < time()) {
    json_error('Enter your password to see the student details.', 403, ['locked' => true]);
}

$details = fn (array $u) => [
    'name' => display_name($u),
    'accountType' => $u['account_type'],
    'username' => $u['account_type'] === 'student' ? $u['username'] : null,
    'gradeSection' => $u['grade_section'],
    'adviser' => $u['adviser_name'],
    'email' => $u['account_type'] === 'student' ? $u['email'] : null, // guests: no email, they stay anonymous
    'contactNumber' => $u['contact_number'],
    'expired' => $u['status'] === 'Expired',
];

$reportNo = positive_int((string) ($_GET['report'] ?? ''));
if ($reportNo !== null) {
    $stmt = db()->prepare('SELECT is_anonymous, grade_level, user_id FROM reports WHERE report_no = ?');
    $stmt->execute([$reportNo]);
    $r = $stmt->fetch();
    if (!$r || !staff_sees_grade($admin, $r['grade_level'])) json_error('That report was not found.', 404);
    $user = $r['user_id'] !== null ? find_user((int) $r['user_id']) : null;
    if (!$user) json_error('This old report is not linked to an account.', 404);
    audit((int) $admin['admin_id'], 'student.view_info', 'report', $reportNo);
    send_json(['success' => true, 'student' => $r['is_anonymous']
        ? ['anonymous' => true, 'contactNumber' => $user['contact_number']] // identity stays hidden
        : ['anonymous' => false] + $details($user)]);
}

$userId = positive_int((string) ($_GET['user'] ?? ''));
$user = $userId !== null ? find_user($userId) : null;
if (!$user || !staff_sees_grade($admin, $user['grade_level'])) json_error('That account was not found.', 404);
audit((int) $admin['admin_id'], 'student.view_info', 'user', $userId);
send_json(['success' => true, 'student' => ['anonymous' => false] + $details($user)]);
