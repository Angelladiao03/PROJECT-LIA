<?php
// Admin / guidance office login. Replaces AdminLoginServlet.java.
// POST: username, password

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');

$username = post('username');
$password = post('password');

if (is_blank($username)) json_error('Please enter your username.');
if (is_blank($password)) json_error('Please enter your password.');

$stmt = db()->prepare(
    'SELECT admin_id, admin_password, admin_fullname
     FROM admin_profile WHERE admin_username = ?'
);
$stmt->execute([$username]);
$admin = $stmt->fetch();

if (!$admin || !check_password($password, $admin['admin_password'])) {
    json_error('Invalid Username or Password!');
}

$adminId = (int) $admin['admin_id'];

// Upgrade an old plain-text password to a secure hash.
if (!is_hashed($admin['admin_password'])) {
    db()->prepare('UPDATE admin_profile SET admin_password = ? WHERE admin_id = ?')
        ->execute([hash_password($password), $adminId]);
}

$fullName = as_text($admin['admin_fullname']);
log_in_admin($adminId, $fullName);

json_success('Login successful.', [
    'adminId' => $adminId,
    'fullName' => $fullName,
]);
