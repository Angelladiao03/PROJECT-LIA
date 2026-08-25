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

    /**
     * Publicly reusable JSON string escaper, shared by every servlet that
     * hand-builds JSON. Handles the two "obvious" characters (backslash and
     * double quote) plus every other character JSON actually requires to be
     * escaped: newlines, carriage returns, tabs, and any other raw control
     * character. This matters a lot here because several fields in this app
     * come straight from a <textarea> (SOS description, report description,
     * chat messages) where the student can just press Enter -- if a raw
     * newline slips into the JSON unescaped, the string literal breaks and
     * the browser's JSON.parse() throws, which silently empties out
     * whatever list was being loaded (that's exactly what was happening to
     * the SOS table whenever an alert's description had a line break in it).
     */
    public static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\': sb.append("\\\\"); break;
                case '"':  sb.append("\\\""); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }
}