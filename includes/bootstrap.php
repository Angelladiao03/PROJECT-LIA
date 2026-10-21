<?php
// Every file in public/api/ starts with:
//     require_once __DIR__ . '/../../includes/bootstrap.php';
// so they all get the same helpers.

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/json.php';
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/passwords.php';

// Any error we didn't catch becomes a clean JSON error instead of a PHP error page.
set_exception_handler('json_server_error');

function require_method(string ...$allowed): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        json_error('Method not allowed.', 405);
    }
}

// Stops the request unless an admin is logged in.
// GET pages get a 401 so the frontend sends them back to the login page.
function require_admin(): int
{
    $adminId = current_admin_id();
    if ($adminId === null) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            json_session_expired();
        }
        json_error('You must be logged in as admin.');
    }
    return $adminId;
}
