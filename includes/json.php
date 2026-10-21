<?php
// Small helpers for sending JSON back to the browser.
// Replaces JsonUtil.java. The response shapes are exactly the same as the
// Java version, so the existing JavaScript keeps working.

function send_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_success(string $message, array $extra = []): void
{
    send_json(array_merge(['success' => true, 'message' => $message], $extra));
}

function json_error(string $message, int $status = 200): void
{
    send_json(['success' => false, 'message' => $message], $status);
}

function json_session_expired(): void
{
    send_json([
        'success' => false,
        'sessionExpired' => true,
        'message' => 'Your session has expired. Please log in again.',
    ], 401);
}

// The Java version sent every value as a string ("12", "true", "" for
// null). The frontend was written for that, so we keep doing it.
function as_text($value): string
{
    if ($value === null) {
        return '';
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    return (string) $value;
}

// Turns database rows into a list of objects with the given key names,
// all values as text. $map is [jsonKey => databaseColumn].
function rows_as_text(array $rows, array $map): array
{
    $out = [];
    foreach ($rows as $row) {
        $item = [];
        foreach ($map as $jsonKey => $column) {
            $item[$jsonKey] = as_text($row[$column] ?? null);
        }
        $out[] = $item;
    }
    return $out;
}

// Logs the real error for us, but shows the user a simple message
// (never send raw database errors to the browser).
function json_server_error(Throwable $e): void
{
    error_log('[LIA] ' . get_class($e) . ': ' . $e->getMessage());
    json_error('Something went wrong on the server. Please try again.', 500);
}
