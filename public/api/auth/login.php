<?php
// Sign in as a guest or as a student.
// POST: kind ("guest" or "student"), identifier, password
//   guest:   identifier = guest ID (e.g. LIA-7K3P9Q, the "LIA-" is optional), or the guest's username if it has one (test accounts)
//   student: identifier = username or email

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$kind = input('kind');
$identifier = input('identifier');
$password = $_POST['password'] ?? '';

if (!in_array($kind, ['guest', 'student'], true)) json_error('Choose Student or Guest.');
if ($identifier === '') json_error($kind === 'guest' ? 'Enter your guest ID.' : 'Enter your username or email.');
if (!is_string($password) || $password === '') json_error('Enter your password.');

// A guest ID (LIA-7K3P9Q) typed on the Student tab: guest accounts sign in on the Guest tab.
// Student usernames can't have a "-", so this can never be a student's username.
if ($kind === 'student' && preg_match('/^LIA-[A-Z0-9]{6}$/i', preg_replace('/\s+/', '', $identifier))) {
    json_error('That is a guest ID. Guest accounts sign in on the Guest tab, not the Student tab.', 400, ['useTab' => 'guest']);
}

if ($kind === 'guest') {
    $guestId = strtoupper(preg_replace('/\s+/', '', $identifier));
    if (!str_starts_with($guestId, 'LIA-')) {
        $guestId = 'LIA-' . $guestId;
    }
    $stmt = db()->prepare("SELECT * FROM users WHERE account_type = 'guest' AND (guest_id = ? OR LOWER(username) = LOWER(?))
                           ORDER BY (status = 'Active') DESC LIMIT 1");
    $stmt->execute([$guestId, $identifier]);
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
    // Right account and password, but on the wrong tab (e.g. a guest account on the Student tab)?
    // We only say so when the password is correct, so this tells nobody which accounts exist.
    if (other_tab_match($kind, $identifier, $password)) {
        json_error($kind === 'student'
            ? 'This is a guest account. Choose the Guest tab above, then sign in again.'
            : 'This is a student account. Choose the Student tab above, then sign in with your username.', 401, ['useTab' => $kind === 'student' ? 'guest' : 'student']);
    }
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

// True when the identifier and password belong to an account of the OTHER kind
// (a guest account typed on the Student tab, or a student account on the Guest tab).
function other_tab_match(string $kind, string $identifier, string $password): bool
{
    if ($kind === 'student') {
        $guestId = strtoupper(preg_replace('/\s+/', '', $identifier));
        if (!str_starts_with($guestId, 'LIA-')) $guestId = 'LIA-' . $guestId;
        $stmt = db()->prepare("SELECT password_hash FROM users WHERE account_type = 'guest' AND status = 'Active'
                               AND (guest_id = ? OR LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))");
        $stmt->execute([$guestId, $identifier, $identifier]);
    } else {
        $stmt = db()->prepare("SELECT password_hash FROM users WHERE account_type = 'student' AND status = 'Active'
                               AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))");
        $stmt->execute([$identifier, $identifier]);
    }
    foreach ($stmt->fetchAll() as $row) {
        if (check_password($password, $row['password_hash'])) return true;
    }
    return false;
}
