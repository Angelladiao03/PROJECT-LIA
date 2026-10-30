<?php
// Forgot password, step 2: check the code and save the new password.
// POST: email, code, newPassword, confirmPassword

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$email = strtolower(input('email'));
$code = preg_replace('/\D/', '', input('code'));
$new = $_POST['newPassword'] ?? '';
$confirm = $_POST['confirmPassword'] ?? '';
if (!is_string($new) || !is_string($confirm)) json_error('Fill in every field.');
if ($error = email_error($email)) json_error($error);

$user = active_account_by_email($email);
if (!$user) json_error('No account uses this email.', 404);

// Check the password first, so a typo doesn't use up a code attempt.
if ($error = password_error($new)) json_error($error);
if ($new !== $confirm) json_error("The new passwords don't match.");

$row = check_email_code($email, $code, 'reset');

$pdo = db();
$pdo->beginTransaction();
$pdo->prepare('UPDATE email_codes SET used_at = NOW() WHERE code_id = ?')->execute([$row['code_id']]);
$pdo->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')->execute([hash_password($new), $user['user_id']]);
$pdo->commit();

// Unlock the account if it was locked by wrong passwords
clear_failed_logins('guest:' . $user['guest_id']);
if ($user['username']) clear_failed_logins('student:' . strtolower($user['username']));
clear_failed_logins('student:' . strtolower($user['email']));

send_email($email, 'Your LagroInAction password was changed',
    "Your password was just changed using a reset code.\n\nIf this wasn't you, tell the guidance office right away.");

json_success('Password changed. You can sign in now.', [
    'signInAs' => $user['account_type'],
    'identifier' => $user['account_type'] === 'student' ? ($user['username'] ?: $user['email']) : $user['guest_id'],
]);
