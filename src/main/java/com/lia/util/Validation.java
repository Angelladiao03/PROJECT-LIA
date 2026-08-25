package com.lia.util;

import java.util.regex.Pattern;

/**
 * Server-side validation rules, shared by RegisterServlet and
 * StudentProfileServlet. These mirror (and are the source of truth for)
 * the same rules enforced in script.js / studentReports.js on the client,
 * so a request that bypasses the browser still gets checked properly here.
 */
public final class Validation {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}$");

    // At least 8 characters, at least one letter and one number.
    private static final Pattern PASSWORD_PATTERN =
        Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

    public static final int USERNAME_MIN_LENGTH = 13;
    public static final int LRN_LENGTH = 12;

    private Validation() {}

    public static boolean isValidLrn(String lrn) {
        return lrn != null && lrn.matches("\\d{" + LRN_LENGTH + "}");
    }

    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    public static boolean isValidUsername(String username) {
        return username != null && username.trim().length() >= USERNAME_MIN_LENGTH;
    }

    public static boolean isStrongPassword(String password) {
        return password != null && PASSWORD_PATTERN.matcher(password).matches();
    }
}
