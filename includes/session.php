<?php
// Login sessions, saved in the database (table: php_sessions) because
// Render wipes its disk on every restart/deploy.

require_once __DIR__ . '/db.php';

const SESSION_LIFETIME_SECONDS = 60 * 60; // signed out after 1 hour of no activity

class DatabaseSessionHandler implements SessionHandlerInterface
{
    public function open($path, $name): bool { return true; }
    public function close(): bool { return true; }

    public function read($id): string|false
    {
        $stmt = db()->prepare('SELECT data FROM php_sessions WHERE id = ? AND expires_at > NOW()');
        $stmt->execute([$id]);
        $data = $stmt->fetchColumn();
        return $data === false ? '' : $data;
    }

    public function write($id, $data): bool
    {
        return db()->prepare(
            "INSERT INTO php_sessions (id, data, expires_at)
             VALUES (?, ?, NOW() + make_interval(secs => ?))
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at"
        )->execute([$id, $data, SESSION_LIFETIME_SECONDS]);
    }

    public function destroy($id): bool
    {
        return db()->prepare('DELETE FROM php_sessions WHERE id = ?')->execute([$id]);
    }

    public function gc($max_lifetime): int|false
    {
        return db()->exec('DELETE FROM php_sessions WHERE expires_at < NOW()');
    }
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'); // Render
}

const SESSION_COOKIE = 'LIASESSID';

// True if the browser sent a session cookie. Checking this first means a
// visitor who isn't signed in never gets a new (empty) session created.
function has_session_cookie(): bool
{
    return !empty($_COOKIE[SESSION_COOKIE]);
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_save_handler(new DatabaseSessionHandler(), true);
    session_name(SESSION_COOKIE);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,   // JavaScript can't read the cookie
        'samesite' => 'Lax',  // other websites can't send requests as the user
    ]);
    ini_set('session.gc_maxlifetime', (string) SESSION_LIFETIME_SECONDS);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

// Signs in a student/guest account (and signs out any staff account).
function sign_in_user(int $userId): void
{
    start_session();
    session_regenerate_id(true); // new session id on sign-in (stops session fixation)
    $_SESSION = ['userId' => $userId];
}

// Signs in a staff account (and signs out any student/guest account).
function sign_in_admin(int $adminId): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION = ['adminId' => $adminId];
}

function sign_out(): void
{
    start_session();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'],
        'httponly' => $p['httponly'], 'samesite' => $p['samesite'],
    ]);
    session_destroy();
}
