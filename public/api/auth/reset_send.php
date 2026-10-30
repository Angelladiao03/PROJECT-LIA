<?php
// Forgot password, step 1: email a 6-digit code to the account's email.
// POST: email

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$email = strtolower(input('email'));
if ($error = email_error($email)) json_error($error);

$user = active_account_by_email($email);
if (!$user) json_error('No account uses this email. Check the spelling, or create a guest account.', 404);

$code = issue_email_code($email, 'reset');
$sent = send_email(
    $email,
    'Reset your LagroInAction password',
    "Your password reset code is: $code\n\n"
    . "Enter it on the LagroInAction \"Forgot password\" page to choose a new password. "
    . "The code works for " . CODE_VALID_MINUTES . " minutes.\n\n"
    . "If you didn't ask for this, ignore this email. Your password stays the same."
);
if (!$sent) {
    if (is_development()) {
        json_success('Email service is not set up, so here is your code (development mode only).', ['devCode' => $code]);
    }
    json_error('We could not send the email right now. Try again in a few minutes.', 503);
}
json_success("We sent a 6-digit code to $email. Check your inbox and spam folder.");
