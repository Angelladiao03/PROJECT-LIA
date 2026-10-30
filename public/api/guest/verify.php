<?php
// Step 3 of creating a guest account: check the code, then create the account.
// POST: email, code   (the phone number comes from step 2, saved in the session)
// Success -> { guestId, password, expiresAt }  (the password is shown ONCE)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$email = strtolower(input('email'));
$code = preg_replace('/\D/', '', input('code'));

start_session();
$signup = $_SESSION['guestSignup'] ?? null;
if (!$signup || $signup['email'] !== $email) {
    json_error('Start again: accept the Terms and enter your email.', 400, ['restart' => true]);
}
$row = check_email_code($email, $code, 'signup');

// Check again: someone may have used this email or phone number in the last few minutes.
if (active_account_by_email($email) || contact_in_use($signup['contactNumber'] ?? '')) {
    json_error('This email or phone number already has an account. Sign in, or reset your password.', 409, ['hasAccount' => true]);
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
    "INSERT INTO users (account_type, guest_id, email, contact_number, password_hash, terms_version, terms_accepted_at, expires_at)
     VALUES ('guest', ?, ?, ?, ?, ?, ?, NOW() + make_interval(days => ?))
     RETURNING *"
);
$stmt->execute([$guestId, $email, $signup['contactNumber'], hash_password($password), $signup['termsVersion'], $signup['agreedAt'], GUEST_LIFETIME_DAYS]);
$user = $stmt->fetch();
$pdo->commit();

sign_in_user((int) $user['user_id']); // also clears guestSignup

// Welcome email with the guest ID (never the password)
send_email(
    $email,
    'You are now registered in LagroInAction!',
    "You are now Registered!\n\n"
    . "Your LagroInAction guest account is ready.\n\nGuest ID: $guestId\n\n"
    . "Sign in on the Guest tab with this guest ID and your password. "
    . "For your safety, your password is NOT included in this email. "
    . "If you forget it, use \"Forgot password?\" on the sign-in page.\n\n"
    . "Your guest account lasts " . GUEST_LIFETIME_DAYS . " days. Reports you send are kept even after it expires. "
    . "You can ask for a permanent student account on the My Account page.\n\n"
    . "- Lagro High School Guidance Office"
);

json_success('Your guest account is ready.', [
    'guestId' => $guestId,
    'password' => $password,
    'expiresAt' => $user['expires_at'],
    'account' => public_account($user),
]);
