<?php
// Staff: My Account (every staff role).
// GET                                                          -> your account
// POST action=profile  fullName, username                       -> edit your profile
// POST action=password currentPassword, newPassword, confirmPassword -> change your password
// Your role and grade level are set by the system administrator, not here.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin();
$adminId = (int) $admin['admin_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    send_json(['success' => true, 'account' => public_staff($admin)]);
}

$action = input('action');

if ($action === 'profile') {
    $fullName = input('fullName');
    $username = input('username');
    if ($fullName === '' || too_long($fullName, 150)) json_error('Enter your full name.');
    if ($error = username_error($username)) json_error($error);
    $stmt = db()->prepare('SELECT 1 FROM admin_profile WHERE LOWER(admin_username) = LOWER(?) AND admin_id <> ?');
    $stmt->execute([$username, $adminId]);
    if ($stmt->fetch()) json_error('That username is taken. Choose another.');
    db()->prepare('UPDATE admin_profile SET admin_fullname = ?, admin_username = ? WHERE admin_id = ?')
        ->execute([$fullName, $username, $adminId]);
    audit($adminId, 'staff.profile', 'staff', $adminId);
    json_success('Profile updated.', ['account' => public_staff(require_admin())]);
}

if ($action === 'password') {
    $current = $_POST['currentPassword'] ?? '';
    $new = $_POST['newPassword'] ?? '';
    $confirm = $_POST['confirmPassword'] ?? '';
    if (!is_string($current) || !is_string($new) || !is_string($confirm)) json_error('Fill in every field.');
    if ($current === '') json_error('Enter your current password.');
    if (!check_password($current, $admin['admin_password'])) json_error('Your current password is wrong.');
    if ($error = password_error($new)) json_error($error);
    if ($new !== $confirm) json_error('The new passwords do not match.');
    if ($new === $current) json_error('Choose a password different from your current one.');
    db()->prepare('UPDATE admin_profile SET admin_password = ? WHERE admin_id = ?')->execute([hash_password($new), $adminId]);
    session_regenerate_id(true);
    audit($adminId, 'staff.password', 'staff', $adminId);
    json_success('Password changed.');
}

json_error('Unknown action.');
