<?php
// Sign out (students, guests and staff).

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

// Remember which staff member is signing out, for the audit log.
$adminId = null;
if (has_session_cookie()) {
    start_session();
    $adminId = !empty($_SESSION['adminId']) ? (int) $_SESSION['adminId'] : null;
}
sign_out();
if ($adminId) audit($adminId, 'staff.sign_out', 'staff', $adminId);
json_success('Signed out.');
