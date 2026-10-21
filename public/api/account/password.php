<?php
// Change your own password (students and guests).
// POST: currentPassword, newPassword, confirmPassword

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$user = require_user();

$current = $_POST['currentPassword'] ?? '';
$new = $_POST['newPassword'] ?? '';
$confirm = $_POST['confirmPassword'] ?? '';
if (!is_string($current) || !is_string($new) || !is_string($confirm)) json_error('Fill in every field.');

if ($current === '') json_error('Enter your current password.');
if (!check_password($current, $user['password_hash'])) json_error('Your current password is wrong.');
if ($error = password_error($new)) json_error($error);
if ($new !== $confirm) json_error("The new passwords don't match.");
if ($new === $current) json_error('Choose a password different from your current one.');

db()->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
    ->execute([hash_password($new), $user['user_id']]);

session_regenerate_id(true);
json_success('Password changed.');
