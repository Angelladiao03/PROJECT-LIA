package com.lia.util;

import java.util.regex.Pattern;

/**
 * Server-side validation rules, shared by RegisterServlet and
 * StudentProfileServlet. These mirror (and are the source of truth for)
 * the same rules enforced in script.js / studentReports.js on the client,
 * so a request that bypasses the browser still gets checked properly here.
 */
public final class Validation {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}$");
    private static final Pattern DIGITS_ONLY = Pattern.compile("^\\d+$");
    private static final Pattern HAS_LETTER = Pattern.compile(".*[A-Za-z].*");
    private static final Pattern HAS_DIGIT = Pattern.compile(".*\\d.*");

    public static final int USERNAME_MIN_LENGTH = 8;
    public static final int USERNAME_MAX_LENGTH = 24;
    public static final int LRN_LENGTH = 12;
    public static final int CONTACT_NUMBER_LENGTH = 11;

    private Validation() {
    }

    /**
     * Returns a specific reason an LRN is invalid, or null if it's valid.
     * Lets callers show the exact problem instead of one generic message.
     */
    public static String lrnError(String lrn) {
        String trimmed = lrn == null ? "" : lrn.trim();
        if (trimmed.isEmpty()) {
            return "LRN is required!";
        }
        if (!DIGITS_ONLY.matcher(trimmed).matches()) {
            return "LRN must contain numbers only!";
        }
        if (trimmed.length() != LRN_LENGTH) {
            return "LRN must be " + LRN_LENGTH + " numbers!";
        }
        return null;
    }

    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Returns a specific reason a contact number is invalid, or null if it's
     * valid. Philippine mobile numbers: exactly 11 digits, starting with
     * "09" (e.g. 09171234567).
     */
    public static String contactNumberError(String contactNumber) {
        String trimmed = contactNumber == null ? "" : contactNumber.trim();
        if (trimmed.isEmpty()) {
            return "Contact number is required!";
        }
        if (!DIGITS_ONLY.matcher(trimmed).matches()) {
            return "Contact number must contain numbers only!";
        }
        if (trimmed.length() != CONTACT_NUMBER_LENGTH) {
            return "Contact number must be " + CONTACT_NUMBER_LENGTH + " numbers!";
        }
        if (!trimmed.startsWith("09")) {
            return "Contact number must start with 09!";
        }
        return null;
    }

    /**
     * Returns a specific "too short" / "too long" message for an invalid
     * username, or null if the username is valid. Lets callers show the
     * exact reason instead of one generic "invalid username" message.
     */
    public static String usernameError(String username) {
        if (username == null || username.trim().isEmpty()) {
            return "Username is required!";
        }
        int length = username.trim().length();
        if (length < USERNAME_MIN_LENGTH) {
            return "Username must be at least " + USERNAME_MIN_LENGTH + " characters long!";
        }
        if (length > USERNAME_MAX_LENGTH) {
            return "Username must not exceed " + USERNAME_MAX_LENGTH + " characters!";
        }
        return null;
    }

    /**
     * Returns a specific reason a password is too weak, checked one rule at
     * a time (length, then letter, then number) so the person sees exactly
     * what's missing, e.g. "Password must have a number!"
     */
    public static String passwordError(String password) {
        String value = password == null ? "" : password;
        if (value.length() < 8) {
            return "Password must be at least 8 characters!";
        }
        if (!HAS_LETTER.matcher(value).matches()) {
            return "Password must have a letter!";
        }
        if (!HAS_DIGIT.matcher(value).matches()) {
            return "Password must have a number!";
        }
        return null;
    }
}
