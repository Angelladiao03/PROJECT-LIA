<?php
// Sends emails through Brevo (free plan: 300 emails a day).
// Setup: README.md -> "Sending emails (Brevo)".
//
// Every email is also written to the email_outbox table (address, subject,
// sent or not) so you can check delivery. The email body is NOT stored,
// because it can contain codes and personal details.

function email_service_ready(): bool
{
    return setting('BREVO_API_KEY') !== null && setting('MAIL_FROM_EMAIL') !== null;
}

// Returns true if the email was sent.
function send_email(string $to, string $subject, string $text): bool
{
    $stmt = db()->prepare('INSERT INTO email_outbox (to_email, subject) VALUES (?, ?) RETURNING email_id');
    $stmt->execute([$to, $subject]);
    $emailId = (int) $stmt->fetchColumn();

    if (!email_service_ready()) {
        mark_email($emailId, null, 'Email service not set up (BREVO_API_KEY / MAIL_FROM_EMAIL missing).');
        return false;
    }

    $html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#17241c">'
        . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'))
        . '<p style="color:#5b6b60;font-size:13px;margin-top:24px">LagroInAction · Lagro High School Guidance Office</p></div>';

    $payload = json_encode([
        'sender' => ['email' => setting('MAIL_FROM_EMAIL'), 'name' => setting('MAIL_FROM_NAME', 'LagroInAction')],
        'to' => [['email' => $to]],
        'subject' => $subject,
        'textContent' => $text,
        'htmlContent' => $html,
    ]);

    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nAccept: application/json\r\napi-key: " . setting('BREVO_API_KEY') . "\r\n",
        'content' => $payload,
        'timeout' => 15,
        'ignore_errors' => true, // so we can read Brevo's error message
    ]]);

    $response = @file_get_contents('https://api.brevo.com/v3/smtp/email', false, $context);
    $statusLine = $http_response_header[0] ?? '';
    $ok = $response !== false && preg_match('#HTTP/\S+\s+2\d\d#', $statusLine) === 1;

    if ($ok) {
        mark_email($emailId, 'sent', null);
    } else {
        $error = trim($statusLine . ' ' . substr((string) $response, 0, 300));
        mark_email($emailId, null, $error ?: 'Could not reach Brevo.');
        error_log('[LIA] Email to ' . $to . ' failed: ' . $error);
    }
    return $ok;
}

function mark_email(int $emailId, ?string $sent, ?string $error): void
{
    db()->prepare('UPDATE email_outbox SET sent_at = CASE WHEN ? THEN NOW() END, error = ? WHERE email_id = ?')
        ->execute([$sent !== null ? 'true' : 'false', $error, $emailId]);
}
