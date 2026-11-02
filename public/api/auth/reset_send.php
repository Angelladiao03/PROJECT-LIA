<?php
// Forgot password, step 1: email a one-time link to the account's email.
// POST: identifier = username (students) or guest ID (guests)
// Reply: the email address with most letters hidden, e.g. "an**************01@gmail.com",
// so the person knows where to look without the page showing anyone's full email.

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

const RESET_LINK_MINUTES = 30;

$identifier = input('identifier');
if ($identifier === '') json_error('Enter your username or guest ID.');

$guestId = strtoupper(preg_replace('/\s+/', '', $identifier));
if (!str_starts_with($guestId, 'LIA-')) $guestId = 'LIA-' . $guestId;
$stmt = db()->prepare(
    "SELECT * FROM users WHERE status = 'Active'
       AND (LOWER(username) = LOWER(?) OR (account_type = 'guest' AND guest_id = ?))
     LIMIT 1"
);
$stmt->execute([$identifier, $guestId]);
$user = $stmt->fetch();
if ($user) $user = apply_guest_expiry($user);
if (!$user || $user['status'] !== 'Active') {
    json_error('No account uses this username or guest ID. Check the spelling. (Guests: your guest ID looks like LIA-7K3P9Q.)', 404);
}
if (!$user['email']) json_error('This account has no email address. Ask the guidance office to help you sign in.', 409);

// At most 1 link per minute per account, and 10 per hour per device
$stmt = db()->prepare(
    "SELECT COUNT(*) FILTER (WHERE user_id = ? AND created_at > NOW() - INTERVAL '60 seconds') AS recent_for_account,
            COUNT(*) FILTER (WHERE ip_address = ? AND created_at > NOW() - INTERVAL '1 hour') AS recent_for_ip
     FROM password_resets"
);
$stmt->execute([$user['user_id'], client_ip()]);
$limits = $stmt->fetch();
if ($limits['recent_for_account'] > 0) json_error('A link was just sent. Wait a minute before asking for a new one.', 429);
if ($limits['recent_for_ip'] >= 10) json_error('Too many requests. Try again in an hour.', 429);

// The link's secret is only saved as a hash, so someone who reads the database can't use it.
// Asking for a new link cancels the older ones.
$token = bin2hex(random_bytes(32));
db()->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')->execute([$user['user_id']]);
db()->prepare(
    'INSERT INTO password_resets (user_id, token_hash, ip_address, expires_at) VALUES (?, ?, ?, NOW() + make_interval(mins => ?))'
)->execute([$user['user_id'], hash('sha256', $token), client_ip(), RESET_LINK_MINUTES]);

$link = site_url() . '/reset.html?token=' . $token;
$sent = send_email(
    $user['email'],
    'Reset your LagroInAction password',
    "Someone (hopefully you) asked to reset the password of your LagroInAction account.\n\n"
    . "Open this link to choose a new password:\n$link\n\n"
    . "The link works once, for " . RESET_LINK_MINUTES . " minutes.\n\n"
    . "If you didn't ask for this, ignore this email. Your password stays the same."
);
$masked = mask_email($user['email']);
if (!$sent) {
    if (is_development()) {
        json_success('Email service is not set up, so here is the link (development mode only).', ['sentTo' => $masked, 'devLink' => $link]);
    }
    json_error('We could not send the email right now. Try again in a few minutes.', 503);
}
json_success("We sent a password reset link to $masked.", ['sentTo' => $masked]);
