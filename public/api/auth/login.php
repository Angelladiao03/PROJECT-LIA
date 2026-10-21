<?php
// Sign in as a guest or as a student.
// POST: kind ("guest" or "student"), identifier, password
//   guest:   identifier = guest ID (e.g. LIA-7K3P9Q, the "LIA-" is optional)
//   student: identifier = username or email

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$kind = input('kind');
$identifier = input('identifier');
$password = $_POST['password'] ?? '';

if (!in_array($kind, ['guest', 'student'], true)) json_error('Choose Student or Guest.');
if ($identifier === '') json_error($kind === 'guest' ? 'Enter your guest ID.' : 'Enter your username or email.');
if (!is_string($password) || $password === '') json_error('Enter your password.');

if ($kind === 'guest') {
    $guestId = strtoupper(preg_replace('/\s+/', '', $identifier));
    if (!str_starts_with($guestId, 'LIA-')) {
        $guestId = 'LIA-' . $guestId;
    }
    $stmt = db()->prepare("SELECT * FROM users WHERE guest_id = ? AND account_type = 'guest'");
    $stmt->execute([$guestId]);
    $lockKey = 'guest:' . $guestId;
} else {
    $stmt = db()->prepare(
        "SELECT * FROM users WHERE account_type = 'student' AND status = 'Active'
         AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))"
    );
    $stmt->execute([$identifier, $identifier]);
    $lockKey = 'student:' . strtolower($identifier);
}

stop_if_locked($lockKey);
$user = $stmt->fetch();

if (!$user || !check_password($password, $user['password_hash'])) {
    record_failed_login($lockKey);
    // Same message either way, so nobody can find out which accounts exist.
    json_error($kind === 'guest' ? 'Wrong guest ID or password.' : 'Wrong username/email or password.', 401);
}

clear_failed_logins($lockKey);
$user = apply_guest_expiry($user);

if ($user['status'] === 'Expired') {
    json_error(
        'This guest account expired. Your reports are kept by the guidance office. '
        . 'Create a new guest account to continue.',
        403,
        ['expired' => true]
    );
}

if (!is_hashed($user['password_hash'])) { // upgrade an old plain-text password
    db()->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
        ->execute([hash_password($password), $user['user_id']]);
}
db()->prepare('UPDATE users SET last_login_at = NOW() WHERE user_id = ?')->execute([$user['user_id']]);

sign_in_user((int) $user['user_id']);
json_success('Signed in.', ['account' => public_account($user)]);
