<?php
// Runs the "you have unread messages" reminder now.
// For a free scheduler like cron-job.org: call  GET /api/system/reminders.php?key=YOUR_CRON_KEY
// every 10 minutes. Set CRON_KEY in Render's environment variables. Without CRON_KEY this is turned off.
// (Even without a scheduler, reminders still go out while people use the website.)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET');

$key = setting('CRON_KEY');
if ($key === null || !hash_equals($key, (string) ($_GET['key'] ?? ''))) json_error('Not allowed.', 403);

$sent = send_unread_message_reminders();
json_success("Reminder check done. Emails sent: $sent.");
