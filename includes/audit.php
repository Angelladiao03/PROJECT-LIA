<?php
// Audit log: who did what, and when (ISO/IEC 25010 security: accountability).
// Every staff action that changes a report, an SOS alert or an account calls audit().
// Rows are never edited or deleted.

// $action      short code, e.g. 'report.approve', 'sos.dispatch', 'account.decline'
// $targetType  'report', 'sos', 'activation' or 'staff'
// $targetId    the report number, SOS number, request id or staff id
// $details     optional extra text (e.g. the reject reason)
function audit(int $adminId, string $action, string $targetType, ?int $targetId, string $details = ''): void
{
    try {
        db()->prepare(
            'INSERT INTO audit_log (admin_id, action, target_type, target_id, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$adminId, $action, $targetType, $targetId, mb_substr($details, 0, 1000), client_ip()]);
    } catch (Throwable $e) {
        // The action itself already worked; don't show the user an error because of the log.
        error_log('audit log failed: ' . $e->getMessage());
    }
}

// Plain-language text for each action code, shown in the case history.
function audit_label(string $action): string
{
    return [
        'report.approve' => 'Accepted the report',
        'report.investigate' => 'Started the investigation',
        'report.resolve' => 'Marked the report resolved',
        'report.reject' => 'Rejected the report',
        'report.archive' => 'Archived the report',
        'report.unarchive' => 'Restored the report from the archive',
        'sos.dispatch' => 'Dispatched help for the SOS',
        'sos.respond' => 'Marked the SOS as responded',
        'account.approve' => 'Approved the permanent account',
        'account.decline' => 'Declined the account request',
        'staff.sign_in' => 'Signed in',
        'staff.sign_out' => 'Signed out',
    ][$action] ?? $action;
}
