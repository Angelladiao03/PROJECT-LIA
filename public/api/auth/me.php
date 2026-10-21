<?php
// Who is signed in? Every page calls this first.
// GET -> { success, role: "user" | "admin", account: {...} }  or 401

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');

if (!has_session_cookie()) {
    json_session_expired();
}
start_session();

if (!empty($_SESSION['adminId'])) {
    $admin = require_admin();
    send_json([
        'success' => true,
        'role' => 'admin',
        'account' => [
            'adminId' => (int) $admin['admin_id'],
            'username' => $admin['admin_username'],
            'displayName' => $admin['admin_fullname'],
        ],
    ]);
}

$user = require_user();

// Status of a request to become a permanent student account (if any)
$stmt = db()->prepare(
    'SELECT status, decline_reason, submitted_at FROM activation_requests
     WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1'
);
$stmt->execute([$user['user_id']]);
$request = $stmt->fetch() ?: null;

send_json([
    'success' => true,
    'role' => 'user',
    'account' => public_account($user),
    'activation' => $request ? [
        'status' => $request['status'],
        'declineReason' => $request['decline_reason'],
        'submittedAt' => $request['submitted_at'],
    ] : null,
]);
