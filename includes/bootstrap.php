<?php
// Every file in public/api/ starts with:
//     require_once __DIR__ . '/../../../includes/bootstrap.php';
// so they all get the same helpers.
//
// HOW ONE REQUEST WORKS (for example: a student presses "Submit Report")
//   1. The page's JavaScript calls LIA.api('reports/create.php', { body: form }) (assets/js/core.js).
//      The browser sends a POST to /api/reports/create.php with the form fields and the session cookie.
//   2. Apache runs that PHP file. Its first line loads this file, which loads all the helpers below.
//   3. The endpoint checks the request:
//        require_method('POST')   - right kind of request, sent by our own pages (X-LIA header)
//        require_user()           - who is signed in (from the session cookie); stops if no one is
//        require_admin('counselor', 'advocate') on staff endpoints - and checks the staff role
//   4. It reads the fields with input('name'), checks each one (json_error('...') stops with a
//      message the page shows), and talks to the database with prepared statements:
//        $stmt = db()->prepare('INSERT ... VALUES (?, ?)');  $stmt->execute([$a, $b]);
//      The "?" are filled in by the database driver, so typed text can never become SQL.
//   5. It answers with json_success('Report submitted.', [...extra data...]) (includes/json.php).
//      The page receives that JSON as the result of LIA.api(...).
//
// WHAT EACH HELPER FILE IS FOR
//   config.php      settings (database address, email keys)      db.php          the database connection
//   json.php        JSON replies and error replies                validation.php  checking typed input
//   session.php     sign-in sessions (kept in the database)       passwords.php   password hashing
//   accounts.php    who is signed in, roles, guest accounts       mailer.php      sending emails
//   audit.php       the record of every staff action              notify.php      notification emails
//   attachments.php files sent in messages                        messages.php    report chats (closing)

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/json.php';
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/passwords.php';
require_once __DIR__ . '/accounts.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/notify.php';
require_once __DIR__ . '/attachments.php';
require_once __DIR__ . '/messages.php';

// After each API request, maybe send the "unread messages" reminder emails (at most every 10 minutes).
register_shutdown_function('maybe_run_background_jobs');

// Any error we didn't catch becomes a clean JSON message instead of a PHP error page.
set_exception_handler('json_server_error');

// Only allow the listed request methods (GET, POST).
// POST requests must also carry the "X-LIA: 1" header, which our own
// pages always send. Other websites can't add it, so they can't make
// a signed-in person's browser submit things without them knowing.
function require_method(string ...$allowed): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        json_error('This address does not accept ' . $method . ' requests.', 405);
    }
    if ($method === 'POST' && ($_SERVER['HTTP_X_LIA'] ?? '') !== '1') {
        json_error('Request blocked. Please reload the page and try again.', 403);
    }
}
