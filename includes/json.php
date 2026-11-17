<?php
// Helpers for sending JSON back to the browser.
// Every response has "success": true/false and a "message" people can read.

// Work to do after the reply has been sent, e.g. notification emails to staff, so the person
// who submitted something does not wait for the emails. Used like:
//     after_response(fn () => notify_staff_sos($sosNo));
function after_response(callable $job): void
{
    $GLOBALS['LIA_AFTER_RESPONSE'][] = $job;
}

function send_json(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $jobs = $GLOBALS['LIA_AFTER_RESPONSE'] ?? [];
    $GLOBALS['LIA_AFTER_RESPONSE'] = [];
    if (!$jobs) {
        echo $body;
        exit;
    }
    // Send the whole reply now and tell the browser it is complete, then do the jobs.
    header('Content-Length: ' . strlen($body));
    header('Connection: close');
    echo $body;
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        while (ob_get_level() > 0) ob_end_flush();
        flush();
    }
    ignore_user_abort(true);
    foreach ($jobs as $job) {
        try {
            $job();
        } catch (Throwable $e) {
            error_log('[LIA] after response: ' . $e->getMessage()); // never affects the reply already sent
        }
    }
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
