package com.lia.servlet;

// Small hand-rolled JSON helper - didn't want to pull in Gson just for a
// handful of small response objects.
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

    // For GET endpoints that normally return a JSON array once the session
    // check fails. Used to just print "[]" with a 200, so an expired login
    // looked identical to "no data yet" and the page rendered empty with no
    // explanation. Pair with SC_UNAUTHORIZED so the frontend can actually
    // tell the difference and bounce back to the login page.
    public static String sessionExpired() {
        return "{\"success\": false, \"sessionExpired\": true, "
                + "\"message\": \"Your session has expired. Please log in again.\"}";
    }

    // Escapes backslash/quote plus the usual control characters (newline,
    // tab, etc). Needed because fields like the SOS description or a chat
    // message come from a <textarea>, and an unescaped newline breaks the
    // JSON string and makes JSON.parse() throw on the frontend.
    public static String escapeJson(String s) {
        if (s == null)
            return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\':
                    sb.append("\\\\");
                    break;
                case '"':
                    sb.append("\\\"");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
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