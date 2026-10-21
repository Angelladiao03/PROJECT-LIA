<?php
// Reads the database connection string.
//
// On Render: set an environment variable named DATABASE_URL to your Neon
// connection string (Render dashboard -> your service -> Environment).
//
// On your own computer: copy includes/config.local.example.php to
// includes/config.local.php and paste your Neon *dev* branch connection
// string there. config.local.php is in .gitignore, so the password never
// gets uploaded to GitHub.

function lia_database_url(): string
{
    $url = getenv('DATABASE_URL');
    if ($url !== false && $url !== '') {
        return $url;
    }

    $localFile = __DIR__ . '/config.local.php';
    if (is_file($localFile)) {
        $local = require $localFile;
        if (!empty($local['database_url'])) {
            return $local['database_url'];
        }
    }

    throw new RuntimeException(
        'No database configured. Set DATABASE_URL, or create includes/config.local.php.'
    );
}
