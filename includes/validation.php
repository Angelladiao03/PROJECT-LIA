<?php
// Server-side input checks. Each *_error() function returns a message
// people can understand, or null when the value is fine.

const USERNAME_MIN_LENGTH = 8;
const USERNAME_MAX_LENGTH = 24;
const CONTACT_NUMBER_LENGTH = 11;

// Fixed lists (the report form uses the same lists).
const REPORT_CATEGORIES = [
    'Verbal bullying', 'Physical bullying', 'Social exclusion', 'Cyberbullying',
    'Threats or intimidation', 'Other',
];
const REPORT_LOCATIONS = [
    'Classroom', 'Hallway or stairs', 'Canteen', 'Comfort room', 'School gate',
    'Covered court or field', 'Library', 'Online or group chat', 'Outside school', 'Other',
];
const REPORTER_ROLES = ['victim', 'witness', 'other'];

// Reads a POST field as trimmed text. Returns '' when missing.
function input(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

function too_long(string $value, int $max): bool
{
    return mb_strlen($value) > $max;
}

function email_error(string $email): ?string
{
    if ($email === '') return 'Enter your email address.';
    if (too_long($email, 150) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Enter a valid email address, like name@gmail.com.';
    }
    return null;
}

function username_error(string $username): ?string
{
    if ($username === '') return 'Choose a username.';
    $len = mb_strlen($username);
    if ($len < USERNAME_MIN_LENGTH) return 'Username must be at least ' . USERNAME_MIN_LENGTH . ' characters.';
    if ($len > USERNAME_MAX_LENGTH) return 'Username must be at most ' . USERNAME_MAX_LENGTH . ' characters.';
    if (!preg_match('/^[A-Za-z0-9._]+$/', $username)) {
        return 'Username can only use letters, numbers, dots and underscores.';
    }
    return null;
}

function password_error(string $password): ?string
{
    if (strlen($password) < 8) return 'Password must be at least 8 characters.';
    if (strlen($password) > 72) return 'Password must be at most 72 characters.';
    if (!preg_match('/[A-Za-z]/', $password)) return 'Password must include a letter.';
    if (!preg_match('/\d/', $password)) return 'Password must include a number.';
    return null;
}

function contact_number_error(string $number): ?string
{
    if ($number === '') return 'Enter your contact number.';
    if (!ctype_digit($number)) return 'Contact number can only have numbers.';
    if (strlen($number) !== CONTACT_NUMBER_LENGTH) return 'Contact number must be 11 digits, like 09171234567.';
    if (strncmp($number, '09', 2) !== 0) return 'Contact number must start with 09.';
    return null;
}

// Returns the value if it's a whole positive number, otherwise null.
function positive_int(string $value): ?int
{
    return ctype_digit($value) && $value !== '' && strlen($value) < 10 ? (int) $value : null;
}
