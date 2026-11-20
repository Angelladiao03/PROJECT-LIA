<?php
// Staff: add or change the email for notifications. The new email must be confirmed with a 6-digit code.
//   POST action=send    email         -> emails a code to the new email
//   POST action=verify  email, code   -> checks the code, then saves the new email
// The email can be changed once every 7 days, and the old email (if any) is told about the change.
// (The shared steps are in includes/accounts.php: send_email_change_code(), check_email_change_code().)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');
$admin = require_admin(); // every staff role
$adminId = (int) $admin['admin_id'];

$action = input('action');
$email = strtolower(input('email'));

// Checks for both steps: a valid email, not the current one, not used by another staff account,
// and the last change was at least 7 days ago.
if ($error = email_error($email)) json_error($error);
if ($email === strtolower((string) $admin['admin_email'])) json_error('This is already your email address.');
$stmt = db()->prepare('SELECT 1 FROM admin_profile WHERE LOWER(admin_email) = ? AND admin_id <> ?');
$stmt->execute([$email, $adminId]);
if ($stmt->fetch()) json_error('This email already belongs to another staff account.', 409);
stop_if_changed_recently($admin['email_changed_at'], 'email');

if ($action === 'send') {
    send_email_change_code("staff:$adminId", $email, 'staff'); // stops here
}

if ($action === 'verify') {
    $code = preg_replace('/\D/', '', input('code'));
    $row = check_email_change_code("staff:$adminId", $email, $code);

    $pdo = db();
    $pdo->beginTransaction(); // both changes are saved together, or neither
    $pdo->prepare('UPDATE email_codes SET used_at = NOW() WHERE code_id = ?')->execute([$row['code_id']]);
    $pdo->prepare('UPDATE admin_profile SET admin_email = ?, email_changed_at = NOW() WHERE admin_id = ?')->execute([$email, $adminId]);
    $pdo->commit();
    forget_email_change();
    audit($adminId, 'staff.email', 'staff', $adminId);

    // Tell the old email, if there was one (after the reply)
    $oldEmail = $admin['admin_email'];
    $greeting = 'Dear ' . $admin['admin_fullname'] . ',';
    after_response(fn () => notify_email_changed($oldEmail, $email, $greeting, 'staff'));

    json_success('Your email for notifications has been changed.', ['account' => public_staff(require_admin())]);
}

json_error('Unknown action.');
