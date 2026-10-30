<?php
// Everything about student and guest accounts: who is signed in, guest
// expiry, generating guest IDs and passwords, and blocking password guessing.

const GUEST_LIFETIME_DAYS = 30;
const OPEN_CASE_STATUSES = ['Pending', 'Active', 'Under Investigation'];
const TERMS_VERSION = 'draft-2026-11';

// Letters and numbers that are easy to read (no 0/O, 1/I/L).
const READABLE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function random_from(string $chars, int $length): string
{
    $out = '';
    for ($i = 0; $i < $length; $i++) {
        $out .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $out;
}

// A new, unused guest ID like "LIA-7K3P9Q".
function new_guest_id(): string
{
    $stmt = db()->prepare('SELECT 1 FROM users WHERE guest_id = ?');
    do {
        $id = 'LIA-' . random_from(READABLE_CHARS, 6);
        $stmt->execute([$id]);
    } while ($stmt->fetch());
    return $id;
}

// A random password like "pq7M-k3Xt-9aWd" (always has letters and numbers).
function new_random_password(): string
{
    $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    do {
        $p = random_from($chars, 4) . '-' . random_from($chars, 4) . '-' . random_from($chars, 4);
    } while (password_error($p) !== null);
    return $p;
}

function find_user(int $userId): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE user_id = ?');
    $stmt->execute([$userId]);
    return $stmt->fetch() ?: null;
}

// A guest account stays usable while it has an open case or a pending
// request to become a student account, even after its 1 month is up.
function has_open_business(int $userId): bool
{
    $placeholders = implode(',', array_fill(0, count(OPEN_CASE_STATUSES), '?'));
    $stmt = db()->prepare(
        "SELECT 1 FROM reports WHERE user_id = ? AND report_status IN ($placeholders) AND archived_at IS NULL
         UNION ALL
         SELECT 1 FROM activation_requests WHERE user_id = ? AND status = 'Pending'
         LIMIT 1"
    );
    $stmt->execute(array_merge([$userId], OPEN_CASE_STATUSES, [$userId]));
    return (bool) $stmt->fetch();
}

// Marks a guest account as Expired if its time is up and nothing is open.
// Returns the (possibly updated) account. Reports are never deleted.
function apply_guest_expiry(array $user): array
{
    if ($user['account_type'] !== 'guest' || $user['status'] !== 'Active' || $user['expires_at'] === null) {
        return $user;
    }
    if (strtotime($user['expires_at']) > time() || has_open_business((int) $user['user_id'])) {
        return $user;
    }
    db()->prepare("UPDATE users SET status = 'Expired' WHERE user_id = ?")->execute([$user['user_id']]);
    $user['status'] = 'Expired';
    return $user;
}

// The signed-in student/guest account, or null.
function current_user(): ?array
{
    if (!has_session_cookie()) {
        return null;
    }
    start_session();
    if (empty($_SESSION['userId'])) {
        return null;
    }
    $user = find_user((int) $_SESSION['userId']);
    if ($user === null) {
        return null;
    }
    $user = apply_guest_expiry($user);
    return $user['status'] === 'Active' ? $user : null;
}

// Stops the request unless a student/guest is signed in. Returns the account.
function require_user(): array
{
    $user = current_user();
    if ($user === null) {
        json_session_expired();
    }
    return $user;
}

// Stops the request unless a guidance staff member is signed in. Returns the staff account.
function require_admin(): array
{
    if (!has_session_cookie()) {
        json_session_expired();
    }
    start_session();
    if (!empty($_SESSION['adminId'])) {
        $stmt = db()->prepare('SELECT admin_id, admin_username, admin_fullname FROM admin_profile WHERE admin_id = ?');
        $stmt->execute([(int) $_SESSION['adminId']]);
        $admin = $stmt->fetch();
        if ($admin) {
            return $admin;
        }
    }
    json_session_expired();
}

// How the account appears to staff. Guests are shown only by guest ID.
function display_name(array $row): string
{
    if (($row['account_type'] ?? '') === 'student' && !empty($row['full_name'])) {
        return $row['full_name'];
    }
    return 'Guest ' . ($row['guest_id'] ?? '');
}

// Safe account details to send to the account owner's own browser.
function public_account(array $user): array
{
    return [
        'userId' => (int) $user['user_id'],
        'accountType' => $user['account_type'],
        'guestId' => $user['guest_id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'fullName' => $user['full_name'],
        'gradeSection' => $user['grade_section'],
        'adviser' => $user['adviser_name'],
        'contactNumber' => $user['contact_number'],
        'displayName' => $user['account_type'] === 'student' && $user['full_name']
            ? $user['full_name'] : 'Guest',
        'createdAt' => $user['created_at'],
        'expiresAt' => $user['expires_at'],
    ];
}

// ---------- Blocking password guessing ----------
// After 5 wrong passwords for the same account within 15 minutes,
// that account can't be signed into for a while.

const MAX_FAILED_LOGINS = 5;
const LOGIN_LOCK_MINUTES = 15;

function client_ip(): string
{
    // Render puts the visitor's real address first in X-Forwarded-For.
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded !== '') {
        return substr(trim(explode(',', $forwarded)[0]), 0, 64);
    }
    return substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 64);
}

function stop_if_locked(string $key): void
{
    $stmt = db()->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE login_key = ? AND attempted_at > NOW() - make_interval(mins => ?)'
    );
    $stmt->execute([$key, LOGIN_LOCK_MINUTES]);
    if ((int) $stmt->fetchColumn() >= MAX_FAILED_LOGINS) {
        json_error('Too many wrong attempts. Wait ' . LOGIN_LOCK_MINUTES . ' minutes, then try again.', 429);
    }
}

function record_failed_login(string $key): void
{
    db()->prepare('INSERT INTO login_attempts (login_key, ip_address) VALUES (?, ?)')
        ->execute([$key, client_ip()]);
}

function clear_failed_logins(string $key): void
{
    db()->prepare('DELETE FROM login_attempts WHERE login_key = ?')->execute([$key]);
}

// ---------- Duplicate checks ----------

// The active account that uses this email, or null. (An expired guest frees up its email.)
function active_account_by_email(string $email): ?array
{
    $stmt = db()->prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'Active'");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user) return null;
    $user = apply_guest_expiry($user);
    return $user['status'] === 'Active' ? $user : null;
}

// True if another active account already uses this phone number.
function contact_in_use(string $number, ?int $exceptUserId = null): bool
{
    $stmt = db()->prepare("SELECT * FROM users WHERE contact_number = ? AND status = 'Active' AND user_id <> ?");
    $stmt->execute([$number, $exceptUserId ?? 0]);
    foreach ($stmt->fetchAll() as $user) {
        if (apply_guest_expiry($user)['status'] === 'Active') return true;
    }
    return false;
}

// ---------- 6-digit email codes (sign-up and password reset) ----------

const CODE_VALID_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

// Makes a new code for this email and saves its hash. Stops the request if codes
// are asked for too often (1 per minute per email, 10 per hour per device).
function issue_email_code(string $email, string $purpose): string
{
    $stmt = db()->prepare(
        "SELECT
            COUNT(*) FILTER (WHERE LOWER(email) = ? AND created_at > NOW() - INTERVAL '60 seconds') AS recent_for_email,
            COUNT(*) FILTER (WHERE ip_address = ? AND created_at > NOW() - INTERVAL '1 hour') AS recent_for_ip
         FROM email_codes"
    );
    $stmt->execute([$email, client_ip()]);
    $limits = $stmt->fetch();
    if ($limits['recent_for_email'] > 0) json_error('A code was just sent. Wait a minute before asking for a new one.', 429);
    if ($limits['recent_for_ip'] >= 10) json_error('Too many codes requested. Try again in an hour.', 429);

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    db()->prepare(
        'INSERT INTO email_codes (email, code_hash, ip_address, expires_at, purpose)
         VALUES (?, ?, ?, NOW() + make_interval(mins => ?), ?)'
    )->execute([$email, password_hash($code, PASSWORD_DEFAULT), client_ip(), CODE_VALID_MINUTES, $purpose]);
    return $code;
}

// Checks a code. Returns the code's row if it's right; otherwise stops with a clear message.
// The caller marks it used (UPDATE email_codes SET used_at = NOW()) when the action succeeds.
function check_email_code(string $email, string $code, string $purpose): array
{
    if (strlen($code) !== 6) json_error('Enter the 6-digit code from the email.');
    $stmt = db()->prepare(
        'SELECT * FROM email_codes WHERE LOWER(email) = ? AND purpose = ? AND used_at IS NULL
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$email, $purpose]);
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
    return $row;
}
