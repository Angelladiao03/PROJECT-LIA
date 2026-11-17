<?php
// Password helpers.
//
// The Java prototype saved passwords as plain text. New passwords are now
// saved as secure hashes (password_hash). Old plain-text passwords still
// work: the first time that person signs in, their password is upgraded
// to a hash automatically. (This is also how a new staff account added by hand
// in the database gets its hash: see the note at the end of schema.sql.)
//
// A hash is a one-way scramble: password_verify() can check a typed password
// against it, but the password cannot be read back from it.

function hash_password(string $plain): string
{
    return password_hash($plain, PASSWORD_DEFAULT);
}

function is_hashed(string $stored): bool
{
    return password_get_info($stored)['algo'] !== null;
}

function check_password(string $plain, string $stored): bool
{
    if (is_hashed($stored)) {
        return password_verify($plain, $stored);
    }
    return hash_equals($stored, $plain); // old plain-text password
}
