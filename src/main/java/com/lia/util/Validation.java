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

    // At least 8 characters, at least one letter and one number.
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

    public static final int USERNAME_MIN_LENGTH = 8;
    public static final int USERNAME_MAX_LENGTH = 24;
    public static final int LRN_LENGTH = 12;

    private Validation() {
    }

    /**
     * LRN must be numeric and exactly LRN_LENGTH (12) digits -- no shorter, no
     * longer.
     */
    public static boolean isValidLrn(String lrn) {
        return lrn != null && lrn.matches("\\d{" + LRN_LENGTH + "}");
    }

    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Username must be between USERNAME_MIN_LENGTH (8) and USERNAME_MAX_LENGTH (24)
     * characters.
     */
    public static boolean isValidUsername(String username) {
        if (username == null)
            return false;
        int length = username.trim().length();
        return length >= USERNAME_MIN_LENGTH && length <= USERNAME_MAX_LENGTH;
    }

    /**
     * Returns a specific "too short" / "too long" message for an invalid
     * username, or null if the username is valid. Lets callers show the
     * exact reason instead of one generic "invalid username" message.
     */
    public static String usernameError(String username) {
        if (username == null || username.trim().isEmpty()) {
            return "Username is required.";
        }
        int length = username.trim().length();
        if (length < USERNAME_MIN_LENGTH) {
            return "Username must be at least " + USERNAME_MIN_LENGTH + " characters long.";
        }
        if (length > USERNAME_MAX_LENGTH) {
            return "Username must not exceed " + USERNAME_MAX_LENGTH + " characters.";
        }
        return null;
    }

    public static boolean isStrongPassword(String password) {
        return password != null && PASSWORD_PATTERN.matcher(password).matches();
    }
}
