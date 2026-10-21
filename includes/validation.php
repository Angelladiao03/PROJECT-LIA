<?php
// Server-side validation rules. Same rules and messages as Validation.java.
// Each function returns an error message, or null when the value is OK.

const USERNAME_MIN_LENGTH = 8;
const USERNAME_MAX_LENGTH = 24;
const LRN_LENGTH = 12;
const CONTACT_NUMBER_LENGTH = 11;

function lrn_error(?string $lrn): ?string
{
    $v = trim($lrn ?? '');
    if ($v === '') return 'LRN is required!';
    if (!ctype_digit($v)) return 'LRN must contain numbers only!';
    if (strlen($v) !== LRN_LENGTH) return 'LRN must be ' . LRN_LENGTH . ' numbers!';
    return null;
}

function is_valid_email(?string $email): bool
{
    return $email !== null && preg_match('/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/', $email) === 1;
}

function contact_number_error(?string $number): ?string
{
    $v = trim($number ?? '');
    if ($v === '') return 'Contact number is required!';
    if (!ctype_digit($v)) return 'Contact number must contain numbers only!';
    if (strlen($v) !== CONTACT_NUMBER_LENGTH) return 'Contact number must be ' . CONTACT_NUMBER_LENGTH . ' numbers!';
    if (strncmp($v, '09', 2) !== 0) return 'Contact number must start with 09!';
    return null;
}

function username_error(?string $username): ?string
{
    $v = trim($username ?? '');
    if ($v === '') return 'Username is required!';
    $len = mb_strlen($v);
    if ($len < USERNAME_MIN_LENGTH) return 'Username must be at least ' . USERNAME_MIN_LENGTH . ' characters long!';
    if ($len > USERNAME_MAX_LENGTH) return 'Username must not exceed ' . USERNAME_MAX_LENGTH . ' characters!';
    return null;
}

function password_error(?string $password): ?string
{
    $v = $password ?? '';
    if (strlen($v) < 8) return 'Password must be at least 8 characters!';
    if (!preg_match('/[A-Za-z]/', $v)) return 'Password must have a letter!';
    if (!preg_match('/\d/', $v)) return 'Password must have a number!';
    return null;
}

// Reads a POST field. Returns null when it's missing.
function post(string $name): ?string
{
    return isset($_POST[$name]) && is_string($_POST[$name]) ? $_POST[$name] : null;
}

function is_blank(?string $value): bool
{
    return $value === null || trim($value) === '';
}
