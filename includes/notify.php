<?php
// Notification emails to students and guests:
//   - when one of their reports changes status (accepted, under investigation, resolved, not accepted)
//   - when guidance messages stay unread for 1 hour ("You have 3 unread messages...")
// Emails never contain report details or message text, only that something changed,
// because emails can be seen by other people (shared phones, family computers).

// Called by admin/reports.php after a status change.
function notify_report_update(int $reportNo, string $action, ?string $reason = null): void
{
    $stmt = db()->prepare(
        "SELECT u.email, u.status FROM reports r JOIN users u ON u.user_id = r.user_id WHERE r.report_no = ?"
    );
    $stmt->execute([$reportNo]);
    $to = $stmt->fetch();
    if (!$to || !$to['email'] || $to['status'] !== 'Active') return;

    $what = [
        'approve' => "was accepted. The guidance office is now handling it.",
        'investigate' => "is now under investigation by the guidance office.",
        'resolve' => "has been marked as resolved by the guidance office.",
        'reject' => "was not accepted." . ($reason ? "\n\nReason: $reason" : ''),
    ][$action] ?? null;
    if ($what === null) return;

    send_email(
        $to['email'],
        "Update on your LagroInAction report #$reportNo",
        "Your report #$reportNo $what\n\n"
        . "Sign in to LagroInAction and open My Account > My Report History to see the details. "
        . "You can also message the guidance office there.\n\n- Lagro High School Guidance Office"
    );
}

const REMINDER_AFTER_MINUTES = 60;   // email if a guidance message is unread for 1 hour
const REMINDER_CHECK_EVERY_MINUTES = 10;
const REMINDER_MAX_PER_RUN = 10;     // keeps each run short

// Sends "You have N unread messages" emails. Each unread message is only reminded about once.
// Runs at most every 10 minutes (see maybe_run_background_jobs below).
function send_unread_message_reminders(): int
{
    $stmt = db()->prepare(
        "SELECT u.user_id, u.email, COUNT(*) AS unread
         FROM messages m JOIN users u ON u.user_id = m.user_id
         WHERE m.sender_type = 'Admin' AND m.read_at IS NULL AND m.notified_at IS NULL
           AND m.sent_datetime < (NOW() AT TIME ZONE 'UTC') - make_interval(mins => ?)
           AND u.status = 'Active' AND u.email IS NOT NULL
         GROUP BY u.user_id, u.email
         LIMIT " . REMINDER_MAX_PER_RUN
    );
    $stmt->execute([REMINDER_AFTER_MINUTES]);
    $sent = 0;
    foreach ($stmt->fetchAll() as $row) {
        // Count every unread message (not just the old ones) for the email
        $all = db()->prepare("SELECT COUNT(*) FROM messages WHERE user_id = ? AND sender_type = 'Admin' AND read_at IS NULL");
        $all->execute([$row['user_id']]);
        $n = (int) $all->fetchColumn();
        db()->prepare("UPDATE messages SET notified_at = NOW() WHERE user_id = ? AND sender_type = 'Admin' AND read_at IS NULL AND notified_at IS NULL")
            ->execute([$row['user_id']]);
        send_email(
            $row['email'],
            "You have $n unread " . ($n === 1 ? 'message' : 'messages') . ' in LagroInAction',
            "You have $n unread " . ($n === 1 ? 'message' : 'messages') . " from the guidance office in your inbox. "
            . "Please sign in to LagroInAction and open Message to read " . ($n === 1 ? 'it' : 'them') . ".\n\n- Lagro High School Guidance Office"
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

// The report case attached to a message (for the case card in the chat), or null.
function message_case(array $m): ?array
{
    if (empty($m['report_no'])) return null;
    return [
        'reportNo' => (int) $m['report_no'],
        'category' => $m['category'],
        'status' => $m['report_status'],
        'submittedAt' => $m['report_datetime'],
    ];
}
