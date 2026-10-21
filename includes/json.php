<?php
// Helpers for sending JSON back to the browser.
// Every response has "success": true/false and a "message" people can read.

function send_json(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_success(string $message, array $extra = []): never
{
    send_json(['success' => true, 'message' => $message] + $extra);
}

function json_error(string $message, int $status = 400, array $extra = []): never
{
    send_json(['success' => false, 'message' => $message] + $extra, $status);
}

function json_session_expired(): never
{
    send_json([
        'success' => false,
        'sessionExpired' => true,
        'message' => 'Your session has ended. Please sign in again.',
    ], 401);
}

// Logs the real error for us, but shows a simple message to the user
// (raw database errors are never sent to the browser).
function json_server_error(Throwable $e): never
{
    error_log('[LIA] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_error('Something went wrong on the server. Please try again.', 500);
}
