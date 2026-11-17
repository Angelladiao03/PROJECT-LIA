<?php
// Notification emails.
// To students and guests:
//   - when one of their reports changes status (accepted, under investigation, resolved, not accepted)
//   - when guidance messages stay unread for 1 hour ("3 unread messages")
// To guidance staff (only staff who added an email address in My Account > Edit Profile):
//   - a new report: the guidance advocate(s) of the report's grade level
//   - an SOS alert: every guidance counselor and every guidance advocate
// Emails never contain report descriptions, names or message text, only that something happened,
// because emails can be seen by other people (shared phones, family computers).
// Staff emails are sent after the reply reaches the student (after_response() in includes/json.php),
// so submitting a report or an SOS is never slowed down by email.

// Called by admin/reports.php after a status change.
function notify_report_update(int $reportNo, string $action, ?string $reason = null): void
{
    $stmt = db()->prepare(
        "SELECT u.email, u.status, u.account_type, u.full_name, u.guest_id, r.case_id, r.category
         FROM reports r JOIN users u ON u.user_id = r.user_id WHERE r.report_no = ?"
    );
    $stmt->execute([$reportNo]);
    $to = $stmt->fetch();
    if (!$to || !$to['email'] || $to['status'] !== 'Active') return;

    // [new status shown in the box, sentence about it, what happens next]
    $what = [
        'approve' => ['Accepted', 'Your report has been reviewed and accepted by the Guidance Office.',
                      'A guidance staff member is now handling your report. You will be informed of further updates.'],
        'investigate' => ['Under Investigation', 'Your report is now under investigation by the Guidance Office.',
                          'The Guidance Office may contact you for additional information. Please check your messages in LagroInAction regularly.'],
        'intervene' => ['For Intervention', 'Your report is now for intervention by the Guidance Office.',
                        'A guidance staff member will discuss the next steps with you.'],
        'refer' => ['Referred for Additional Support', 'Your report has been referred to a partner office for additional support.',
                    'The Guidance Office will inform you of the next steps.'],
        'resolve' => ['Resolved', 'Your report has been marked as resolved by the Guidance Office.',
                      'If the incident happens again, or if you need further assistance, you may message the Guidance Office or submit a new report.'],
        'reject' => ['Not Accepted', 'After review, your report was not accepted by the Guidance Office.',
                     'You may message the Guidance Office if you have questions about this decision, or submit a new report with more details.'],
    ][$action] ?? null;
    if ($what === null) return;

    $details = ['Report ID' => '#' . $to['case_id'], 'New Status' => $what[0]];
    if ($action === 'reject' && $reason) $details['Reason'] = $reason;
    $details['Date Updated'] = email_when();

    send_email(
        $to['email'],
        "[LagroInAction] Update on Report #{$to['case_id']}",
        [
            'title' => 'Report Status Update',
            'greeting' => email_greeting($to),
            'lines' => ["This is to inform you that there is an update on your report #{$to['case_id']}. {$what[1]}"],
            'details' => $details,
            'button' => ['label' => 'View My Report', 'url' => site_url() . '/app/account.html#report-' . $reportNo],
            'after' => [
                $what[2],
                'For your privacy, the details of your report are not included in this email. Please sign in to LagroInAction and open My Account > My Report History to view them.',
            ],
        ]
    );
}

// ---------- Emails to guidance staff ----------

// Staff accounts that should receive an email. $where filters admin_profile (prepared statement).
function staff_recipients(string $where, array $params = []): array
{
    $stmt = db()->prepare(
        "SELECT admin_id, admin_fullname, admin_email FROM admin_profile
         WHERE admin_email IS NOT NULL AND admin_email <> '' AND ($where)"
    );
    $stmt->execute($params);
    return $stmt->fetchAll();
}

// A new report: email the guidance advocate(s) of the report's grade level.
function notify_staff_new_report(int $reportNo): void
{
    $stmt = db()->prepare('SELECT report_no, case_id, grade_level, report_datetime FROM reports WHERE report_no = ?');
    $stmt->execute([$reportNo]);
    $r = $stmt->fetch();
    if (!$r || $r['grade_level'] === null) return;
    $grade = 'Grade ' . (int) $r['grade_level'];

    foreach (staff_recipients("staff_role = 'advocate' AND grade_level = ?", [(int) $r['grade_level']]) as $staff) {
        send_email(
            $staff['admin_email'],
            "[LagroInAction] New Report #{$r['case_id']} for $grade",
            [
                'title' => 'New Incident Report Received',
                'greeting' => 'Dear ' . $staff['admin_fullname'] . ',',
                'lines' => ["A new incident report has been submitted for $grade and is awaiting review by the Guidance Office."],
                'details' => [
                    'Report ID' => '#' . $r['case_id'],
                    'Grade Level' => $grade,
                    'Date Submitted' => email_when($r['report_datetime']),
                    'Status' => 'New (awaiting review)',
                ],
                'button' => ['label' => 'Review the Report', 'url' => site_url() . '/admin/cases.html#report-' . (int) $r['report_no']],
                'after' => ['For the privacy of the reporter, the details of the report are not included in this email. Please review the report in LagroInAction as soon as possible.'],
                'audience' => 'staff',
            ]
        );
    }
}

// An SOS alert: email every guidance counselor and every guidance advocate.
function notify_staff_sos(int $sosNo): void
{
    $stmt = db()->prepare(
        'SELECT s.sos_no, s.sos_location, s.sos_datetime, u.grade_level
         FROM sos_alerts s LEFT JOIN users u ON u.user_id = s.user_id WHERE s.sos_no = ?'
    );
    $stmt->execute([$sosNo]);
    $a = $stmt->fetch();
    if (!$a) return;

    $details = ['Location' => $a['sos_location'], 'Time Sent' => email_when($a['sos_datetime'])];
    if ($a['grade_level'] !== null) $details['Grade Level'] = 'Grade ' . (int) $a['grade_level'];

    foreach (staff_recipients("staff_role IN ('counselor', 'advocate')") as $staff) {
        send_email(
            $staff['admin_email'],
            '[LagroInAction] URGENT: SOS Alert Received',
            [
                'title' => 'Urgent: SOS Alert Received',
                'urgent' => true,
                'greeting' => 'Dear ' . $staff['admin_fullname'] . ',',
                'lines' => ['A student has sent an SOS alert through LagroInAction and may need immediate assistance.'],
                'details' => $details,
                'button' => ['label' => 'View the SOS Alert', 'url' => site_url() . '/admin/cases.html#sos'],
                'after' => ['Please sign in to LagroInAction to view the alert and coordinate the response. Once the student has been assisted, mark the alert as responded so that other staff members are informed.'],
                'audience' => 'staff',
            ]
        );
    }
}

const REMINDER_AFTER_MINUTES = 60;   // email if a guidance message is unread for 1 hour
const REMINDER_CHECK_EVERY_MINUTES = 10;
const REMINDER_MAX_PER_RUN = 10;     // keeps each run short

// Sends "You have N unread messages" emails. Each unread message is only reminded about once.
// Runs at most every 10 minutes (see maybe_run_background_jobs below).
function send_unread_message_reminders(): int
{
    $stmt = db()->prepare(
        "SELECT u.user_id, u.email, u.account_type, u.full_name, u.guest_id, COUNT(*) AS unread
         FROM messages m JOIN users u ON u.user_id = m.user_id
         WHERE m.sender_type = 'Admin' AND m.read_at IS NULL AND m.notified_at IS NULL AND m.deleted_at IS NULL
           AND m.sent_datetime < (NOW() AT TIME ZONE 'UTC') - make_interval(mins => ?)
           AND u.status = 'Active' AND u.email IS NOT NULL
         GROUP BY u.user_id, u.email, u.account_type, u.full_name, u.guest_id
         LIMIT " . REMINDER_MAX_PER_RUN
    );
    $stmt->execute([REMINDER_AFTER_MINUTES]);
    $sent = 0;
    foreach ($stmt->fetchAll() as $row) {
        // Count every unread message (not just the old ones) for the email
        $all = db()->prepare("SELECT COUNT(*) FROM messages WHERE user_id = ? AND sender_type = 'Admin' AND read_at IS NULL AND deleted_at IS NULL");
        $all->execute([$row['user_id']]);
        $n = (int) $all->fetchColumn();
        db()->prepare("UPDATE messages SET notified_at = NOW() WHERE user_id = ? AND sender_type = 'Admin' AND read_at IS NULL AND notified_at IS NULL")
            ->execute([$row['user_id']]);
        send_email(
            $row['email'],
            '[LagroInAction] Unread ' . ($n === 1 ? 'Message' : 'Messages') . ' from the Guidance Office',
            [
                'title' => 'You Have ' . ($n === 1 ? 'an Unread Message' : 'Unread Messages'),
                'greeting' => email_greeting($row),
                'lines' => ['The Guidance Office has sent you ' . ($n === 1 ? 'a message that has' : 'messages that have') . ' not been read yet.'],
                'note' => "$n unread " . ($n === 1 ? 'message' : 'messages'),
                'button' => ['label' => 'Open Messages', 'url' => site_url() . '/app/messages.html'],
                'after' => ['For your privacy, the contents of messages are never included in emails. Please sign in to LagroInAction to read and reply to ' . ($n === 1 ? 'it' : 'them') . '.'],
            ]
        );
        $sent++;
    }
    return $sent;
}

// Render's free plan has no scheduled jobs, so the reminder check piggybacks on normal
// website traffic: after a request finishes, if 10 minutes have passed since the last
// check, run it once. (UPDATE ... WHERE updated_at < ... makes sure only one request runs it.)
// For exact timing, a free service like cron-job.org can call /api/system/reminders.php.
function maybe_run_background_jobs(): void
{
    try {
        db()->exec("INSERT INTO app_state (state_key, state_value, updated_at)
                    VALUES ('reminders_last_run', '', NOW() - INTERVAL '1 day') ON CONFLICT (state_key) DO NOTHING");
        $claim = db()->prepare(
            "UPDATE app_state SET updated_at = NOW() WHERE state_key = 'reminders_last_run'
             AND updated_at < NOW() - make_interval(mins => ?) RETURNING 1"
        );
        $claim->execute([REMINDER_CHECK_EVERY_MINUTES]);
        if ($claim->fetch()) send_unread_message_reminders();
    } catch (Throwable $e) {
        error_log('[LIA] reminders: ' . $e->getMessage()); // never break the page because of a reminder
    }
}
