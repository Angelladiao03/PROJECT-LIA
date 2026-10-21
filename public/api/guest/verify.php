<?php
// Step 3 of creating a guest account: check the code, then create the account.
// POST: email, code
// Success -> { guestId, password, expiresAt }  (the password is shown ONCE)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

const MAX_CODE_ATTEMPTS = 5;

$email = strtolower(input('email'));
$code = preg_replace('/\D/', '', input('code'));

start_session();
$signup = $_SESSION['guestSignup'] ?? null;
if (!$signup || $signup['email'] !== $email) {
    json_error('Start again: accept the Terms and enter your email.', 400, ['restart' => true]);
}
if (strlen($code) !== 6) json_error('Enter the 6-digit code from the email.');

$stmt = db()->prepare(
    'SELECT * FROM email_codes WHERE LOWER(email) = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || strtotime($row['expires_at']) < time()) {
    json_error('This code has expired. Send a new code.', 400, ['codeExpired' => true]);
}
if ($row['attempts'] >= MAX_CODE_ATTEMPTS) {
    json_error('Too many wrong tries. Send a new code.', 429, ['codeExpired' => true]);
}
if (!password_verify($code, $row['code_hash'])) {
    db()->prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE code_id = ?')->execute([$row['code_id']]);
    $left = MAX_CODE_ATTEMPTS - $row['attempts'] - 1;
    json_error("That code isn't right. $left " . ($left === 1 ? 'try' : 'tries') . ' left.');
}

$guestId = new_guest_id();
$password = new_random_password();

$pdo = db();
$pdo->beginTransaction();
$pdo->prepare('UPDATE email_codes SET used_at = NOW() WHERE code_id = ?')->execute([$row['code_id']]);

// Free the email from an expired guest account, if any (its reports stay).
$pdo->prepare("UPDATE users SET status = 'Expired' WHERE LOWER(email) = ? AND status = 'Active'
               AND account_type = 'guest' AND expires_at < NOW()")->execute([$email]);

$stmt = $pdo->prepare(
    "INSERT INTO users (account_type, guest_id, email, password_hash, terms_version, terms_accepted_at, expires_at)
     VALUES ('guest', ?, ?, ?, ?, ?, NOW() + make_interval(days => ?))
     RETURNING *"
);
$stmt->execute([$guestId, $email, hash_password($password), $signup['termsVersion'], $signup['agreedAt'], GUEST_LIFETIME_DAYS]);
$user = $stmt->fetch();
$pdo->commit();

sign_in_user((int) $user['user_id']); // also clears guestSignup

send_email(
    $email,
    'Your LagroInAction guest account',
    "Your guest account is ready.\n\nGuest ID: $guestId\n\n"
    . "Your password is NOT included in this email for your safety. "
    . "If you forget it, ask the guidance office for help.\n\n"
    . "Your guest account lasts " . GUEST_LIFETIME_DAYS . " days. Reports you send are kept even after it expires."
);

json_success('Your guest account is ready.', [
    'guestId' => $guestId,
    'password' => $password,
    'expiresAt' => $user['expires_at'],
    'account' => public_account($user),
]);
