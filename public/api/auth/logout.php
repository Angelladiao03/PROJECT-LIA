<?php
// Sign out (students, guests and staff).

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('POST');

sign_out();
json_success('Signed out.');
