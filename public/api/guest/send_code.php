<?php
// Step 2 of creating a guest account: email a 6-digit code.
// POST: email, agree ("yes" - the person read and accepted the Terms)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

const CODE_VALID_MINUTES = 10;

$email = strtolower(input('email'));
if (input('agree') !== 'yes') json_error('Read and accept the Terms first.');
if ($error = email_error($email)) json_error($error);

// Is this email already used by an active account?
$stmt = db()->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND status = 'Active'");
$stmt->execute([$email]);
if ($existing = $stmt->fetch()) {
    $existing = apply_guest_expiry($existing); // an expired guest frees up the email
    if ($existing['status'] === 'Active') {
        json_error('This email already has an account. Sign in instead, or use a different email.', 409);
    }
}

// Limits: one code per minute per email, 10 codes per hour from one device.
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
    'INSERT INTO email_codes (email, code_hash, ip_address, expires_at)
     VALUES (?, ?, ?, NOW() + make_interval(mins => ?))'
)->execute([$email, password_hash($code, PASSWORD_DEFAULT), client_ip(), CODE_VALID_MINUTES]);

// Remember (on the server) that this person accepted the Terms for this email.
start_session();
$_SESSION['guestSignup'] = [
    'email' => $email,
    'termsVersion' => TERMS_VERSION,
    'agreedAt' => date('c'),
];

$sent = send_email(
    $email,
    'Your LagroInAction verification code', // the code is only in the email body, never in the subject (subjects are saved in email_outbox)
    "Your verification code is: $code\n\n"
    . "Enter it on the LagroInAction page to finish creating your guest account. "
    . "The code works for " . CODE_VALID_MINUTES . " minutes.\n\n"
    . "If you didn't ask for this, you can ignore this email."
);

if (!$sent) {
    if (is_development()) {
        // Testing on your own computer without an email service: show the code.
        json_success('Email service is not set up, so here is your code (development mode only).', ['devCode' => $code]);
    }
    json_error('We could not send the email right now. Try again in a few minutes.', 503);
}

json_success("We sent a 6-digit code to $email. Check your inbox and spam folder.");
