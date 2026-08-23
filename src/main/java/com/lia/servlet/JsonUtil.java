package com.lia.servlet;

/**
 * Minimal helper to build JSON strings by hand.
 * This project keeps things dependency-free, so instead of adding the Gson
 * library we just build small JSON objects ourselves.
 */
public class JsonUtil {

    public static String success(String message) {
        return "{\"success\": true, \"message\": \"" + escape(message) + "\"}";
    }

    public static String success(String message, String extraKey, String extraValue) {
        return "{\"success\": true, \"message\": \"" + escape(message) + "\", "
             + "\"" + extraKey + "\": \"" + escape(extraValue) + "\"}";
    }

    public static String error(String message) {
        return "{\"success\": false, \"message\": \"" + escape(message) + "\"}";
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
