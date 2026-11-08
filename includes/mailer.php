<?php
// Sends emails through Brevo (free plan: 300 emails a day).
// Setup: docs/SETUP.md -> "Sending emails (Brevo)".
//
// Every email is also written to the email_outbox table (address, subject,
// sent or not) so you can check delivery. The email body is NOT stored,
// because it can contain codes and personal details.
//
// All emails share one layout (like big-company verification emails):
//   school seal + "LagroInAction", a title, then a box with
//   "Dear ...,", the message, a big code or a button, and "Thank you, LagroInAction",
//   then "Please do not reply..." and the school address.

const MAIL_SCHOOL_ADDRESS = 'Lagro High School · Misa de Gallo St. corner Ascension Ave., Brgy. Greater Lagro, Novaliches, Quezon City';

function email_service_ready(): bool
{
    return setting('BREVO_API_KEY') !== null && setting('MAIL_FROM_EMAIL') !== null;
}

// send_email($to, '[LagroInAction] Verification Code', [
//     'title'    => heading inside the email (default: the subject),
//     'greeting' => first line (default 'Dear User,'),
//     'lines'    => paragraphs before the box in the middle,
//     'code'     => big text in the middle, e.g. a 6-digit code or a guest ID (optional),
//     'note'     => smaller text in the middle box instead of a code, e.g. a status or a reason (optional),
//     'button'   => ['label' => 'Reset Password', 'url' => 'https://...'] (optional),
//     'after'    => paragraphs after it (optional),
// ]);
// Returns true if the email was sent.
function send_email(string $to, string $subject, array $mail): bool
{
    $stmt = db()->prepare('INSERT INTO email_outbox (to_email, subject) VALUES (?, ?) RETURNING email_id');
    $stmt->execute([$to, $subject]);
    $emailId = (int) $stmt->fetchColumn();

    if (!email_service_ready()) {
        mark_email($emailId, null, 'Email service not set up (BREVO_API_KEY / MAIL_FROM_EMAIL missing).');
        return false;
    }

    $payload = json_encode([
        'sender' => ['email' => setting('MAIL_FROM_EMAIL'), 'name' => setting('MAIL_FROM_NAME', 'LagroInAction')],
        'to' => [['email' => $to]],
        'subject' => $subject,
        'textContent' => email_text($subject, $mail),
        'htmlContent' => email_html($subject, $mail),
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

// Plain-text version (for email apps that don't show HTML)
function email_text(string $subject, array $m): string
{
    $parts = [$m['greeting'] ?? 'Dear User,'];
    foreach ($m['lines'] ?? [] as $p) $parts[] = $p;
    if (!empty($m['code'])) $parts[] = $m['code'];
    if (!empty($m['note'])) $parts[] = $m['note'];
    if (!empty($m['button'])) $parts[] = $m['button']['label'] . ': ' . $m['button']['url'];
    foreach ($m['after'] ?? [] as $p) $parts[] = $p;
    $parts[] = "Thank you,\nLagroInAction";
    $parts[] = "Please do not reply to this email as it is auto-generated.\n" . MAIL_SCHOOL_ADDRESS;
    return implode("\n\n", $parts);
}

// HTML version. Tables and inline styles, because many email apps ignore normal CSS.
function email_html(string $subject, array $m): string
{
    $e = fn ($s) => nl2br(htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'));
    $p = fn ($s) => '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3a33">' . $e($s) . '</p>';
    $logo = htmlspecialchars(site_url() . '/assets/img/lagro-seal.png', ENT_QUOTES, 'UTF-8');

    $middle = '';
    if (!empty($m['code'])) {
        $middle .= '<p style="margin:6px 0 20px;font-size:32px;font-weight:700;letter-spacing:4px;color:#17352a">' . $e($m['code']) . '</p>';
    }
    if (!empty($m['note'])) {
        $middle .= '<p style="margin:6px 0 20px;padding:12px 14px;border-left:4px solid #1b5e20;border-radius:4px;background:#eef3ef;font-size:16px;font-weight:700;line-height:1.5;color:#17352a">' . $e($m['note']) . '</p>';
    }
    if (!empty($m['button'])) {
        $url = htmlspecialchars($m['button']['url'], ENT_QUOTES, 'UTF-8');
        $middle .= '<p style="margin:8px 0 20px"><a href="' . $url . '" style="display:inline-block;padding:12px 26px;border-radius:6px;background:#1b5e20;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">'
            . $e($m['button']['label']) . '</a></p>'
            . '<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#5b6b60;word-break:break-all">If the button does not work, copy this link into your browser:<br>'
            . '<a href="' . $url . '" style="color:#1b5e20">' . $url . '</a></p>';
    }

    return '<!doctype html><html><body style="margin:0;padding:0;background:#f2f4f3">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f3;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">'
        // seal + name
        . '<tr><td align="center" style="padding:6px 0 18px">'
        . '<img src="' . $logo . '" width="56" height="56" alt="Lagro High School" style="display:block;margin:0 auto 8px;border:0">'
        . '<div style="font-size:22px;font-weight:700;letter-spacing:1px;color:#1b5e20">Lagro<span style="color:#f0a83a">In</span>Action</div>'
        . '</td></tr>'
        // title
        . '<tr><td align="center" style="padding:0 10px 22px;font-size:26px;font-weight:700;line-height:1.25;color:#17352a">' . $e($m['title'] ?? $subject) . '</td></tr>'
        // the box
        . '<tr><td style="padding:26px 26px 12px;background:#ffffff;border:1px solid #dfe5e1;border-radius:14px">'
        . $p($m['greeting'] ?? 'Dear User,')
        . implode('', array_map($p, $m['lines'] ?? []))
        . $middle
        . implode('', array_map($p, $m['after'] ?? []))
        . '<p style="margin:6px 0 14px;font-size:15px;line-height:1.6;color:#2b3a33">Thank you,<br><b>LagroInAction</b></p>'
        . '</td></tr>'
        // footer
        . '<tr><td align="center" style="padding:20px 10px 0;font-size:12px;line-height:1.6;color:#6b7a71">'
        . 'Please do not reply to this email as it is auto-generated.<br>' . $e(MAIL_SCHOOL_ADDRESS)
        . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}

function mark_email(int $emailId, ?string $sent, ?string $error): void
{
    db()->prepare('UPDATE email_outbox SET sent_at = CASE WHEN ? THEN NOW() END, error = ? WHERE email_id = ?')
        ->execute([$sent !== null ? 'true' : 'false', $error, $emailId]);
}
