<?php
// Sends emails through Brevo (free plan: 300 emails a day).
// Setup: docs/SETUP.md -> "Sending emails (Brevo)".
//
// Every email is also written to the email_outbox table (address, subject,
// sent or not) so you can check delivery. The email body is NOT stored,
// because it can contain codes and personal details.
//
// All emails share one formal layout:
//   a dark green header band with the school seal and "LagroInAction", a title, then a white box with
//   "Dear ...,", the message, a big code / a highlighted note / a table of details / a button,
//   and the sign-off. Below the box: help links (e.g. "Forgot your password?"), the
//   "auto-generated, please do not reply" notice, the confidentiality and Data Privacy Act notices,
//   and the school address.

const MAIL_SCHOOL_ADDRESS = 'Lagro High School · Misa de Gallo St. corner Ascension Ave., Brgy. Greater Lagro, Novaliches, Quezon City';

function email_service_ready(): bool
{
    return setting('BREVO_API_KEY') !== null && setting('MAIL_FROM_EMAIL') !== null;
}

// send_email($to, '[LagroInAction] Verification Code', [
//     'title'    => heading inside the email (default: the subject),
//     'greeting' => first line (default 'Dear User,'),
//     'lines'    => paragraphs before the middle part,
//     'code'     => big text in the middle, e.g. a 6-digit code or a guest ID (optional),
//     'note'     => highlighted text in the middle, e.g. a status or a reason (optional),
//     'details'  => ['Report ID' => '#2026-0001', ...] small table in the middle (optional),
//     'button'   => ['label' => 'Reset Password', 'url' => 'https://...'] (optional),
//     'after'    => paragraphs after it (optional),
//     'urgent'   => true for SOS emails (red title bar),
//     'audience' => who receives it, for the help links at the bottom:
//                   'account' (default) = student or guest with an account -> "Forgot your password?" link
//                   'signup'            = no account yet (verification code)
//                   'reset'             = password reset emails (no "forgot password" link)
//                   'staff'             = guidance staff
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
    if (!empty($m['details'])) {
        $parts[] = implode("\n", array_map(fn ($k, $v) => "$k: $v", array_keys($m['details']), $m['details']));
    }
    if (!empty($m['button'])) $parts[] = $m['button']['label'] . ': ' . $m['button']['url'];
    foreach ($m['after'] ?? [] as $p) $parts[] = $p;
    $parts[] = "Respectfully,\nLagroInAction\nGuidance Office, Lagro High School";
    $parts[] = '----------';
    foreach (email_help_lines($m['audience'] ?? 'account') as [$text, $link]) {
        $parts[] = $text . ($link ? ' ' . $link['url'] : '');
    }
    $parts[] = implode("\n", email_notices());
    $parts[] = MAIL_SCHOOL_ADDRESS;
    return implode("\n\n", $parts);
}

// "Need help?" lines at the bottom of every email. Each item: [text, link or null].
function email_help_lines(string $audience): array
{
    $site = site_url();
    return match ($audience) {
        'staff' => [
            ['To view the full details, please sign in to the staff side of LagroInAction.', ['label' => 'Staff Sign In', 'url' => $site . '/staff.html']],
            ['If you are unable to sign in, please contact the system administrator.', null],
        ],
        'signup' => [
            ['If you need assistance, please visit the Guidance Office of Lagro High School.', null],
        ],
        'reset' => [
            ['If you did not make this request, please inform the Guidance Office of Lagro High School.', null],
        ],
        default => [
            ['Forgot your password?', ['label' => 'Reset it here', 'url' => $site . '/reset.html']],
            ['For questions, please send a message to the Guidance Office through LagroInAction or visit the Guidance Office during school hours.', null],
        ],
    };
}

function email_notices(): array
{
    return [
        'This is an automatically generated email. Please do not reply, as this mailbox is not monitored.',
        'This email is intended only for the person to whom it is addressed. If you received it by mistake, please disregard and delete it.',
        'LagroInAction handles personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).',
    ];
}

// HTML version. Tables and inline styles, because many email apps ignore normal CSS.
function email_html(string $subject, array $m): string
{
    $e = fn ($s) => nl2br(htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'));
    $u = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    $p = fn ($s) => '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3a33">' . $e($s) . '</p>';
    $site = site_url();
    $logo = $u($site . '/assets/img/lagro-seal.png');
    $urgent = !empty($m['urgent']);

    $middle = '';
    if (!empty($m['code'])) {
        $middle .= '<p style="margin:6px 0 20px;padding:14px 10px;border-radius:8px;background:#f1f6f2;text-align:center;font-size:30px;font-weight:700;letter-spacing:4px;color:#0f3d2a">' . $e($m['code']) . '</p>';
    }
    if (!empty($m['note'])) {
        $bar = $urgent ? '#b3261e' : '#1b5e20';
        $bg = $urgent ? '#fdecea' : '#eef5ef';
        $middle .= '<p style="margin:6px 0 20px;padding:12px 14px;border-left:4px solid ' . $bar . ';border-radius:4px;background:' . $bg . ';font-size:16px;font-weight:700;line-height:1.5;color:#17352a">' . $e($m['note']) . '</p>';
    }
    if (!empty($m['details'])) {
        $rows = '';
        foreach ($m['details'] as $k => $v) {
            $rows .= '<tr><td style="padding:9px 12px;border-bottom:1px solid #e3e9e5;font-size:14px;color:#5b6b60;white-space:nowrap;vertical-align:top">' . $e($k) . '</td>'
                . '<td style="padding:9px 12px;border-bottom:1px solid #e3e9e5;font-size:14px;font-weight:700;color:#17352a">' . $e($v) . '</td></tr>';
        }
        $middle .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;border:1px solid #e3e9e5;border-radius:8px;border-collapse:separate;background:#fafcfb">' . $rows . '</table>';
    }
    if (!empty($m['button'])) {
        $url = $u($m['button']['url']);
        $color = $urgent ? '#b3261e' : '#1b5e20';
        $middle .= '<p style="margin:8px 0 20px"><a href="' . $url . '" style="display:inline-block;padding:12px 26px;border-radius:6px;background:' . $color . ';color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">'
            . $e($m['button']['label']) . '</a></p>'
            . '<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#5b6b60;word-break:break-all">If the button does not work, copy this link into your browser:<br>'
            . '<a href="' . $url . '" style="color:#1b5e20">' . $url . '</a></p>';
    }

    $help = '';
    foreach (email_help_lines($m['audience'] ?? 'account') as [$text, $link]) {
        $help .= '<p style="margin:0 0 6px;font-size:13px;line-height:1.55;color:#3d4d44">' . $e($text)
            . ($link ? ' <a href="' . $u($link['url']) . '" style="color:#1b5e20;font-weight:700">' . $e($link['label']) . '</a>' : '') . '</p>';
    }
    $notices = implode('', array_map(
        fn ($t) => '<p style="margin:0 0 6px;font-size:12px;line-height:1.55;color:#6b7a71">' . $e($t) . '</p>',
        email_notices()
    ));
    $titleColor = $urgent ? '#b3261e' : '#0f3d2a';

    return '<!doctype html><html><body style="margin:0;padding:0;background:#eef1ef">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1ef;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border:1px solid #dbe3de;border-radius:12px;overflow:hidden">'
        // header band: deep green with a gold line under it
        . '<tr><td align="center" style="padding:22px 20px 18px;background:#0f3d2a">'
        . '<img src="' . $logo . '" width="58" height="58" alt="Lagro High School" style="display:block;margin:0 auto 10px;border:0">'
        . '<div style="font-size:24px;font-weight:700;letter-spacing:0.5px;color:#ffffff">Lagro<span style="color:#f6c453">In</span>Action</div>'
        . '<div style="margin-top:4px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#b9d3c0">Lagro High School &middot; Guidance Office</div>'
        . '</td></tr>'
        . '<tr><td style="height:4px;line-height:4px;font-size:0;background:#e9a93a">&nbsp;</td></tr>'
        // title
        . '<tr><td style="padding:26px 28px 6px;font-size:22px;font-weight:700;line-height:1.3;color:' . $titleColor . '">' . $e($m['title'] ?? $subject) . '</td></tr>'
        // message
        . '<tr><td style="padding:12px 28px 8px">'
        . $p($m['greeting'] ?? 'Dear User,')
        . implode('', array_map($p, $m['lines'] ?? []))
        . $middle
        . implode('', array_map($p, $m['after'] ?? []))
        . '<p style="margin:10px 0 18px;font-size:15px;line-height:1.6;color:#2b3a33">Respectfully,<br><b>LagroInAction</b><br><span style="color:#5b6b60">Guidance Office, Lagro High School</span></p>'
        . '</td></tr>'
        // help links
        . '<tr><td style="padding:16px 28px 10px;border-top:1px solid #e3e9e5;background:#f7faf8">' . $help . '</td></tr>'
        . '</table>'
        // notices + address, outside the box
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">'
        . '<tr><td align="center" style="padding:18px 16px 0">' . $notices
        . '<p style="margin:10px 0 0;font-size:12px;line-height:1.55;color:#6b7a71">' . $e(MAIL_SCHOOL_ADDRESS) . '<br>&copy; ' . date('Y') . ' LagroInAction &middot; <a href="' . $u($site . '/terms.html') . '" style="color:#6b7a71">Terms &amp; Privacy</a></p>'
        . '</td></tr></table>'
        . '</td></tr></table></body></html>';
}

// "Dear Juan Dela Cruz," for students, "Dear Guest LIA-7K3P9Q," for guests
function email_greeting(array $user): string
{
    return 'Dear ' . display_name($user) . ',';
}

// A date and time in Philippine time for emails, e.g. "November 17, 2026, 4:50 PM"
function email_when(?string $timestamp = null): string
{
    $d = new DateTime($timestamp ?? 'now', new DateTimeZone('UTC'));
    return $d->setTimezone(new DateTimeZone('Asia/Manila'))->format('F j, Y, g:i A');
}

function mark_email(int $emailId, ?string $sent, ?string $error): void
{
    db()->prepare('UPDATE email_outbox SET sent_at = CASE WHEN ? THEN NOW() END, error = ? WHERE email_id = ?')
        ->execute([$sent !== null ? 'true' : 'false', $error, $emailId]);
}
