<?php
// Sign in as guidance office staff.
// POST: username, password

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$username = input('username');
$password = $_POST['password'] ?? '';

if ($username === '') json_error('Enter your staff username.');
if (!is_string($password) || $password === '') json_error('Enter your password.');

$lockKey = 'staff:' . strtolower($username);
stop_if_locked($lockKey);

$stmt = db()->prepare('SELECT * FROM admin_profile WHERE LOWER(admin_username) = LOWER(?)');
$stmt->execute([$username]);
$admin = $stmt->fetch();

if (!$admin || !check_password($password, $admin['admin_password'])) {
    record_failed_login($lockKey);
    json_error('Wrong username or password.', 401);
}

clear_failed_logins($lockKey);
if (!is_hashed($admin['admin_password'])) { // upgrade an old plain-text password
    db()->prepare('UPDATE admin_profile SET admin_password = ? WHERE admin_id = ?')
        ->execute([hash_password($password), $admin['admin_id']]);
}

sign_in_admin((int) $admin['admin_id']);
json_success('Signed in.', ['account' => ['displayName' => $admin['admin_fullname']]]);
