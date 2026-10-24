<?php
// Every file in public/api/ starts with:
//     require_once __DIR__ . '/../../../includes/bootstrap.php';
// so they all get the same helpers.

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
