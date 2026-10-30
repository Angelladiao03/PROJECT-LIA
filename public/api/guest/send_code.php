<?php
// Step 2 of creating a guest account: email a 6-digit code.
// POST: email, contactNumber, agree ("yes" - the person read and accepted the Terms)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

$email = strtolower(input('email'));
$contact = input('contactNumber');
if (input('agree') !== 'yes') json_error('Read and accept the Terms first.');
if ($error = email_error($email)) json_error($error);
if ($error = contact_number_error($contact)) json_error($error);

// One account per email and per phone number. Point them to sign in or reset their password.
if (active_account_by_email($email)) {
    json_error('This email already has an account. Sign in, or reset your password if you forgot it.', 409, ['hasAccount' => true]);
}
if (contact_in_use($contact)) {
    json_error('This phone number already has an account. Sign in, or reset your password if you forgot it.', 409, ['hasAccount' => true]);
}

$code = issue_email_code($email, 'signup');

// Remember (on the server) the details and that this person accepted the Terms.
start_session();
$_SESSION['guestSignup'] = [
    'email' => $email,
    'contactNumber' => $contact,
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
