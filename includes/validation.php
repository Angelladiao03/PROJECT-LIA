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

// ---------- Grade level and section ----------
// The section is typed by the student (no fixed list) and always saved in capital letters,
// e.g. "ROSSUM" or "STEM 12-A". It is set when the guest requests a permanent student account;
// after approval, the student cannot change it in Edit Profile.
const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];
const SECTION_MAX_LENGTH = 40;

function clean_section(string $section): string
{
    return mb_strtoupper(trim((string) preg_replace('/\s+/u', ' ', $section)), 'UTF-8');
}

// Places for the Location dropdowns (Submit Report and SOS), from public/assets/locations.json
// (the pages read the same file). "Other" is always added at the end, so people can type a place.
function report_locations(): array
{
    static $places = null;
    if ($places === null) {
        $json = json_decode((string) @file_get_contents(__DIR__ . '/../public/assets/locations.json'), true);
        $list = is_array($json['locations'] ?? null) ? $json['locations'] : [];
        $places = [];
        foreach ($list as $place) {
            // "Other(s)" in the file is skipped: it is always added at the end, with a box to type the place
            if (is_string($place) && trim($place) !== '' && mb_strlen($place) <= 100 && !preg_match('/^others?$/i', trim($place))) {
                $places[] = trim($place);
            }
        }
        $places = array_values(array_unique($places));
        $places[] = 'Other';
    }
    return $places;
}

// Offices a case can be referred to, from public/assets/referrals.json (the Manage Reports
// page reads the same file). "Other" is always allowed, with the office typed in.
function referral_agencies(): array
{
    static $names = null;
    if ($names === null) {
        $json = json_decode((string) @file_get_contents(__DIR__ . '/../public/assets/referrals.json'), true);
        $names = [];
        foreach ((is_array($json['agencies'] ?? null) ? $json['agencies'] : []) as $a) {
            $name = is_array($a) ? trim((string) ($a['name'] ?? '')) : '';
            if ($name !== '' && mb_strlen($name) <= 150 && $name !== 'Other') $names[] = $name;
        }
        $names = array_values(array_unique($names));
    }
    return $names;
}

// Reads a grade level (7 to 12) from a POST field. Returns null if it isn't one.
function grade_input(string $name): ?int
{
    $grade = positive_int(input($name));
    return in_array($grade, GRADE_LEVELS, true) ? $grade : null;
}

// Checks a section that already went through clean_section()
function section_error(string $section): ?string
{
    if ($section === '') return 'Enter your section.';
    if (mb_strlen($section) > SECTION_MAX_LENGTH) return 'The section is too long. Keep it under ' . SECTION_MAX_LENGTH . ' characters.';
    if (!preg_match("/^[\p{Lu}0-9][\p{Lu}0-9 .'-]*$/u", $section)) return 'The section can only have letters, numbers, spaces, dots, apostrophes and dashes.';
    return null;
}

// "Grade 10 - ROSSUM" (shown on pages and saved in grade_section)
function grade_section_label(?int $grade, ?string $section): ?string
{
    if (!$grade) return null;
    return 'Grade ' . $grade . ($section ? ' - ' . $section : '');
}

// Returns the value if it's a whole positive number, otherwise null.
function positive_int(string $value): ?int
{
    return ctype_digit($value) && $value !== '' && strlen($value) < 10 ? (int) $value : null;
}
