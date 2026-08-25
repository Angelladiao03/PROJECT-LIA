package com.lia.servlet;

/**
 * Minimal helper to build JSON strings by hand.
 * This project keeps things dependency-free, so instead of adding the Gson
 * library we just build small JSON objects ourselves.
 *
 * Every servlet in this app shares the same "who's logged in" pattern: check
 * the HttpSession for studentLrn/adminId, and if it's missing, tell the
 * caller instead of quietly pretending there's just no data. That's what
 * sessionExpired() is for -- see its Javadoc below.
 */
public class JsonUtil {

    public static String success(String message) {
        return "{\"success\": true, \"message\": \"" + escapeJson(message) + "\"}";
    }

    public static String success(String message, String extraKey, String extraValue) {
        return "{\"success\": true, \"message\": \"" + escapeJson(message) + "\", "
             + "\"" + extraKey + "\": \"" + escapeJson(extraValue) + "\"}";
    }

    public static String error(String message) {
        return "{\"success\": false, \"message\": \"" + escapeJson(message) + "\"}";
    }

    /**
     * Used whenever a GET endpoint that normally returns a JSON array (reports,
     * SOS alerts, conversations, etc.) discovers the caller has no valid
     * session. Older code just printed "[]" here with a 200 OK, which made an
     * expired/missing login look identical to "there's genuinely no data" --
     * the page would just render empty with no clue why. Callers should pair
     * this with response.setStatus(HttpServletResponse.SC_UNAUTHORIZED) so the
     * frontend can tell the difference and send the user back to the login
     * page instead of silently showing nothing.
     */
    public static String sessionExpired() {
        return "{\"success\": false, \"sessionExpired\": true, "
             + "\"message\": \"Your session has expired. Please log in again.\"}";
    }

    /** Publicly reusable JSON string escaper, shared by every servlet that hand-builds JSON. */
    public static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
