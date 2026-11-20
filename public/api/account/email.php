<?php
// Change the email of a student account. The new email must be confirmed with a 6-digit code.
//   POST action=send    email         -> emails a code to the new email
//   POST action=verify  email, code   -> checks the code, then saves the new email
// The email can be changed once every 7 days, and the old email is told about the change.
// (The shared steps are in includes/accounts.php: send_email_change_code(), check_email_change_code().)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$user = require_user();
$userId = (int) $user['user_id'];

if ($user['account_type'] !== 'student') {
    json_error('Only permanent student accounts can change their email.', 403);
}

$action = input('action');
$email = strtolower(input('email'));

// Checks for both steps: a valid email, not the current one, not used by another account,
// and the last change was at least 7 days ago.
if ($error = email_error($email)) json_error($error);
if ($email === strtolower((string) $user['email'])) json_error('This is already your email address.');
$owner = active_account_by_email($email);
if ($owner && (int) $owner['user_id'] !== $userId) json_error('This email already belongs to another account.', 409);
stop_if_changed_recently($user['email_changed_at'], 'email');

if ($action === 'send') {
    send_email_change_code("user:$userId", $email, 'account'); // stops here
}

if ($action === 'verify') {
    $code = preg_replace('/\D/', '', input('code'));
    $row = check_email_change_code("user:$userId", $email, $code);

    $pdo = db();
    $pdo->beginTransaction(); // both changes are saved together, or neither
    $pdo->prepare('UPDATE email_codes SET used_at = NOW() WHERE code_id = ?')->execute([$row['code_id']]);
    $pdo->prepare('UPDATE users SET email = ?, email_changed_at = NOW() WHERE user_id = ?')->execute([$email, $userId]);
    $pdo->commit();
    forget_email_change();

    // Tell the old email (after the reply, so the student doesn't wait for it)
    $oldEmail = $user['email'];
    $greeting = email_greeting($user);
    after_response(fn () => notify_email_changed($oldEmail, $email, $greeting, 'account'));

    json_success('Your email has been changed.', ['account' => public_account(find_user($userId))]);
}

json_error('Unknown action.');
