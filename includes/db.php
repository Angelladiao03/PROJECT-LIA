<?php
// Opens ONE connection to PostgreSQL (Neon) per request and reuses it.
// Replaces DatabaseConnection.java.

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    // Turn "postgresql://user:pass@host:port/dbname?sslmode=require"
    // into the format PDO expects: "pgsql:host=...;port=...;dbname=..."
    $parts = parse_url(lia_database_url());
    if ($parts === false || empty($parts['host'])) {
        throw new RuntimeException('DATABASE_URL is not a valid postgresql:// URL.');
    }

    $dsn = 'pgsql:host=' . $parts['host']
        . ';port=' . ($parts['port'] ?? 5432)
        . ';dbname=' . ltrim($parts['path'] ?? '/postgres', '/');

    // Pass along options from the URL, e.g. sslmode=require (Neon needs it).
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $options);
        foreach ($options as $key => $value) {
            $dsn .= ';' . $key . '=' . $value;
        }
    }

    $pdo = new PDO(
        $dsn,
        urldecode($parts['user'] ?? ''),
        urldecode($parts['pass'] ?? ''),
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // errors become exceptions
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // rows come back as arrays
            PDO::ATTR_EMULATE_PREPARES => false,               // real prepared statements
        ]
    );
    // All times are stored and sent in UTC; the pages convert them to Philippine time.
    $pdo->exec("SET TIME ZONE 'UTC'");
    return $pdo;
}
