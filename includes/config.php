<?php
// Reads settings.
//
// On Render: set them as environment variables (Render -> your service ->
// Environment). On your own computer: put them in includes/config.local.php
// (copy config.local.example.php). config.local.php is in .gitignore, so
// passwords and keys never get uploaded to GitHub.
//
// Settings used by LIA:
//   DATABASE_URL     Neon connection string (required)
//   APP_ENV          "production" (default) or "development"
//   BREVO_API_KEY    key for sending emails through Brevo
//   MAIL_FROM_EMAIL  the email address emails are sent from
//   MAIL_FROM_NAME   the name shown as the sender (default: LagroInAction)
//   APP_URL          the website's address, e.g. https://lagroinaction.onrender.com
//                    (used in password reset links; optional, the address in the browser is used otherwise)

function setting(string $name, ?string $default = null): ?string
{
    $value = getenv($name);
    if ($value !== false && $value !== '') {
        return trim($value);
    }

    static $local = null;
    if ($local === null) {
        $file = __DIR__ . '/config.local.php';
        $local = is_file($file) ? (require $file) : [];
        // Older config.local.php files used lowercase 'database_url'
        if (isset($local['database_url']) && !isset($local['DATABASE_URL'])) {
            $local['DATABASE_URL'] = $local['database_url'];
        }
    }
    if (isset($local[$name]) && $local[$name] !== '') {
        return trim((string) $local[$name]);
    }
    return $default;
}

function lia_database_url(): string
{
    $url = setting('DATABASE_URL');
    if ($url === null) {
        throw new RuntimeException(
            'No database configured. Set DATABASE_URL, or create includes/config.local.php.'
        );
    }
    return $url;
}

function is_development(): bool
{
    return setting('APP_ENV', 'production') === 'development';
}

// The address of the website, for links in emails (no "/" at the end).
function site_url(): string
{
    $url = setting('APP_URL');
    if ($url !== null) return rtrim($url, '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = preg_replace('/[^A-Za-z0-9.:\-]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    return ($https ? 'https' : 'http') . '://' . $host;
}
