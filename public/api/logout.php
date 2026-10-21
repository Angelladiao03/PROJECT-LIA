<?php
// Ends the login session on the server (new - the Java version only
// cleared the browser's localStorage, so the server session stayed open).

require_once __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');

log_out();
json_success('Logged out.');
