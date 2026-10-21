<?php
// Login sessions.
//
// PHP normally saves sessions as files on the server's disk. Render wipes
// its disk on every restart/deploy, which would log everyone out. So we
// save sessions in the database instead (table: php_sessions).

require_once __DIR__ . '/db.php';

const SESSION_LIFETIME_SECONDS = 30 * 60; // 30 minutes, same as the Java app

class DatabaseSessionHandler implements SessionHandlerInterface
{
    public function open($path, $name): bool { return true; }
    public function close(): bool { return true; }

    public function read($id): string|false
    {
        $stmt = db()->prepare(
            'SELECT data FROM php_sessions WHERE id = ? AND expires_at > NOW()'
        );
        $stmt->execute([$id]);
        $data = $stmt->fetchColumn();
        return $data === false ? '' : $data;
    }

    public function write($id, $data): bool
    {
        $stmt = db()->prepare(
            "INSERT INTO php_sessions (id, data, expires_at)
             VALUES (?, ?, NOW() + make_interval(secs => ?))
             ON CONFLICT (id) DO UPDATE
             SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at"
        );
        return $stmt->execute([$id, $data, SESSION_LIFETIME_SECONDS]);
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

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'); // Render uses this

    session_set_save_handler(new DatabaseSessionHandler(), true);
    session_name('LIASESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,     // JavaScript can't read the cookie
        'samesite' => 'Lax',    // other websites can't send requests as the user
    ]);
    ini_set('session.gc_maxlifetime', (string) SESSION_LIFETIME_SECONDS);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

// Returns the logged-in student's LRN (as a string), or null.
function current_student_lrn(): ?string
{
    start_session();
    return isset($_SESSION['studentLrn']) ? (string) $_SESSION['studentLrn'] : null;
}

// Returns the logged-in admin's id, or null.
function current_admin_id(): ?int
{
    start_session();
    return isset($_SESSION['adminId']) ? (int) $_SESSION['adminId'] : null;
}

function log_in_student(string $lrn, string $username): void
{
    start_session();
    session_regenerate_id(true); // new session id on login (stops session fixation)
    unset($_SESSION['adminId'], $_SESSION['adminFullName']);
    $_SESSION['studentLrn'] = $lrn;
    $_SESSION['username'] = $username;
}

function log_in_admin(int $adminId, string $fullName): void
{
    start_session();
    session_regenerate_id(true);
    unset($_SESSION['studentLrn'], $_SESSION['username']);
    $_SESSION['adminId'] = $adminId;
    $_SESSION['adminFullName'] = $fullName;
}

function log_out(): void
{
    start_session();
    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $params['path'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'],
    ]);
    session_destroy();
}
