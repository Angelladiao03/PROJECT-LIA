<?php
// Forgot password, step 2: the link from the email opens reset.html?token=...
// GET  ?token=...                                -> is the link still good? (and which account it is for)
// POST token, newPassword, confirmPassword       -> save the new password (the link then stops working)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');

// The account for a link that is unused and not expired; otherwise stops with a clear message.
function reset_link(string $token): array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) json_error('This link is not complete. Open it again from the email.', 400, ['badLink' => true]);
    $stmt = db()->prepare(
        "SELECT p.reset_id, u.* FROM password_resets p JOIN users u ON u.user_id = p.user_id
         WHERE p.token_hash = ? AND p.used_at IS NULL AND p.expires_at > NOW() AND u.status = 'Active'"
    );
    $stmt->execute([hash('sha256', $token)]);
    $row = $stmt->fetch();
    if (!$row) json_error('This link has expired or was already used. Ask for a new one.', 410, ['badLink' => true]);
    return $row;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $row = reset_link((string) ($_GET['token'] ?? ''));
    json_success('Link is valid.', ['signInAs' => $row['account_type'], 'name' => $row['account_type'] === 'student' ? $row['username'] : $row['guest_id']]);
}

$row = reset_link(input('token'));
$new = $_POST['newPassword'] ?? '';
$confirm = $_POST['confirmPassword'] ?? '';
if (!is_string($new) || !is_string($confirm)) json_error('Fill in every field.');
if ($error = password_error($new)) json_error($error);
if ($new !== $confirm) json_error("The new passwords don't match.");

$pdo = db();
$pdo->beginTransaction();
$pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE reset_id = ?')->execute([$row['reset_id']]);
$pdo->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')->execute([hash_password($new), $row['user_id']]);
$pdo->commit();

// Unlock the account if it was locked by wrong passwords
clear_failed_logins('guest:' . $row['guest_id']);
if ($row['username']) clear_failed_logins('student:' . strtolower($row['username']));
if ($row['email']) clear_failed_logins('student:' . strtolower($row['email']));

send_email($row['email'], 'Your LagroInAction password was changed',
    "Your password was just changed using a reset link.\n\nIf this wasn't you, tell the guidance office right away.");

json_success('Password changed. You can sign in now.', ['signInAs' => $row['account_type']]);
