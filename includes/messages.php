<?php
// Messages between a student/guest and the guidance office.
//
// Chats are grouped by case:
//   - one chat per report (messages.case_no = the report number), so staff can also
//     message the reporter of an ANONYMOUS report without ever learning who it is;
//   - one general chat per student (case_no = NULL) for questions that aren't about a report.
//
// Messages can be edited or deleted by the person who sent them (like Messenger).
// "Deleted" only hides the message: the row and every earlier version of the text
// (table message_edits) stay in the database for the record.

// The columns every message query needs (m = messages, a = admin_profile, r = reports via report_no)
const MESSAGE_COLUMNS = 'm.message_id, m.user_id, m.admin_id, m.sender_type, m.message_text, m.sent_datetime,
    m.edited_at, m.deleted_at, m.report_no, m.case_no, m.file_name, m.file_size, m.file_type,
    a.admin_fullname, r.category, r.report_status, r.report_datetime, r.case_id';

// All messages of one chat, oldest first. $caseNo null = the general chat.
function thread_messages(int $userId, ?int $caseNo): array
{
    $stmt = db()->prepare(
        'SELECT ' . MESSAGE_COLUMNS . '
         FROM messages m
         LEFT JOIN admin_profile a ON a.admin_id = m.admin_id
         LEFT JOIN reports r ON r.report_no = m.report_no
         WHERE m.user_id = ? AND m.case_no IS NOT DISTINCT FROM CAST(? AS INT)
         ORDER BY m.sent_datetime ASC, m.message_id ASC'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $caseNo, $caseNo === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

// One message as the page sees it. $viewer is 'student' or 'staff'.
// A deleted message keeps its place in the chat but shows no text, file or case.
function message_out(array $m, string $viewer, ?int $myAdminId = null): array
{
    $fromStaff = $m['sender_type'] === 'Admin';
    $fromSystem = $m['sender_type'] === 'System'; // automatic notice, e.g. "This conversation was closed..."
    $deleted = $m['deleted_at'] !== null;
    $mine = !$fromSystem && ($viewer === 'staff' ? ($fromStaff && (int) $m['admin_id'] === $myAdminId) : !$fromStaff);
    return [
        'id' => (int) $m['message_id'],
        'from' => $fromSystem ? 'system' : ($fromStaff ? 'guidance' : ($viewer === 'staff' ? 'them' : 'me')),
        'mine' => $mine,
        'text' => $deleted ? '' : $m['message_text'],
        'deleted' => $deleted,
        'edited' => !$deleted && $m['edited_at'] !== null,
        'sentAt' => $m['sent_datetime'],
        'staffName' => $fromStaff ? $m['admin_fullname'] : null,
        'case' => $deleted ? null : message_case($m),
        'file' => $deleted ? null : message_file($m),
    ];
}

// ----- Closing a report's chat -----
// When a report is Resolved or Rejected, its chat stays open for any last questions until
// 3 days pass with no messages (counted from the status change or the last message, whichever
// is later). Then the chat closes: it can still be read (and staff can print it from Report
// Records), but no one can send, edit or delete messages, and an automatic notice is added.
const CHAT_CLOSES_AFTER_DAYS = 3;

// Closes the chats that have been quiet for 3 days. $reportNo = only check that report (null = all).
// Runs with the background jobs (includes/notify.php) and whenever a report chat is opened or used.
// "chat_closed_at IS NULL" in the UPDATE makes sure each chat is closed (and the notice sent) only once.
function close_quiet_chats(?int $reportNo = null): void
{
    $stmt = db()->prepare(
        "UPDATE reports r SET chat_closed_at = NOW()
         WHERE r.report_status IN ('Resolved', 'Rejected') AND r.chat_closed_at IS NULL
           AND (CAST(? AS INT) IS NULL OR r.report_no = CAST(? AS INT))
           AND GREATEST(COALESCE(r.finished_at, r.updated_at, r.report_datetime),
                        (SELECT MAX(m.sent_datetime) FROM messages m WHERE m.case_no = r.report_no))
               < NOW() - make_interval(days => ?)
         RETURNING r.report_no, r.user_id, r.case_id, r.report_status"
    );
    $stmt->bindValue(1, $reportNo, $reportNo === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(2, $reportNo, $reportNo === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(3, CHAT_CLOSES_AFTER_DAYS, PDO::PARAM_INT);
    $stmt->execute();
    foreach ($stmt->fetchAll() as $r) {
        if ($r['user_id'] === null) continue; // very old report without an account: it has no chat
        $days = CHAT_CLOSES_AFTER_DAYS;
        db()->prepare("INSERT INTO messages (user_id, sender_type, message_text, case_no) VALUES (?, 'System', ?, ?)")->execute([
            $r['user_id'],
            "This conversation was closed automatically because no messages were sent for $days days after report #{$r['case_id']} was marked as {$r['report_status']}. It remains available to read, but new messages can no longer be sent.",
            $r['report_no'],
        ]);
    }
}

// What a report's chat page needs to know: is it closed, or will it close after 3 quiet days?
function chat_state(?int $caseNo): array
{
    if ($caseNo === null) return ['closed' => false, 'closing' => false];
    close_quiet_chats($caseNo);
    $stmt = db()->prepare('SELECT report_status, chat_closed_at FROM reports WHERE report_no = ?');
    $stmt->execute([$caseNo]);
    $r = $stmt->fetch();
    $closed = $r && $r['chat_closed_at'] !== null;
    return [
        'closed' => $closed,
        'closing' => $r && !$closed && in_array($r['report_status'], ['Resolved', 'Rejected'], true),
    ];
}

// Stops with an error if the chat of report $caseNo is closed.
function stop_if_chat_closed(?int $caseNo): void
{
    if ($caseNo === null || !chat_state($caseNo)['closed']) return;
    json_error('This conversation has been closed, so new messages can no longer be sent or changed. It remains available to read.', 409, ['closed' => true]);
}

// Saves a message (with an optional file and report case card). Returns the new message id.
// $caseNo = the chat it belongs to (null = general chat). $reportNo = a case card attached by staff.
function save_message(int $userId, ?int $adminId, string $sender, string $text, ?array $file, ?int $caseNo = null, ?int $reportNo = null): int
{
    stop_if_chat_closed($caseNo);
    $stmt = db()->prepare(
        'INSERT INTO messages (user_id, admin_id, sender_type, message_text, case_no, report_no, file_name, file_type, file_size, file_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING message_id'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $adminId, $adminId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(3, $sender);
    $stmt->bindValue(4, $text);
    $stmt->bindValue(5, $caseNo, $caseNo === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(6, $reportNo, $reportNo === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(7, $file['name'] ?? null);
    $stmt->bindValue(8, $file['type'] ?? null);
    $stmt->bindValue(9, $file['size'] ?? null, $file ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->bindValue(10, $file['data'] ?? null, $file ? PDO::PARAM_LOB : PDO::PARAM_NULL);
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

// Checks the text typed in the message box.
function message_text_input(bool $required): string
{
    $text = input('text');
    if ($required && $text === '') json_error('Type a message first.');
    if (too_long($text, 2000)) json_error('Keep messages under 2,000 characters.');
    return $text;
}

// Edit or delete one of YOUR OWN messages (POST action=edit|delete, id, text).
// $owner: ['student' => userId] or ['staff' => adminId]. Stops the request with the result.
function edit_or_delete_message(string $action, array $owner): never
{
    $id = positive_int(input('id'));
    if ($id === null) json_error('Choose a message first.');
    [$who, $ownerId] = [array_key_first($owner), (int) reset($owner)];
    $sql = $who === 'staff'
        ? "SELECT * FROM messages WHERE message_id = ? AND sender_type = 'Admin' AND admin_id = ?"
        : "SELECT * FROM messages WHERE message_id = ? AND sender_type = 'Student' AND user_id = ?";
    $stmt = db()->prepare($sql);
    $stmt->execute([$id, $ownerId]);
    $m = $stmt->fetch();
    if (!$m) json_error('You can only change messages you sent.', 403);
    if ($m['deleted_at'] !== null) json_error('This message was already deleted.', 409);
    stop_if_chat_closed($m['case_no'] !== null ? (int) $m['case_no'] : null);

    if ($action === 'delete') {
        db()->prepare('UPDATE messages SET deleted_at = NOW() WHERE message_id = ?')->execute([$id]);
        if ($who === 'staff') audit($ownerId, 'message.delete', 'message', $id);
        json_success('Message deleted.');
    }

    // Edit: the text may only be empty if the message still has a file or a case card
    $text = message_text_input($m['file_name'] === null && $m['report_no'] === null);
    if ($text === $m['message_text']) json_success('No changes.');
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO message_edits (message_id, old_text) VALUES (?, ?)')->execute([$id, $m['message_text']]);
    $pdo->prepare('UPDATE messages SET message_text = ?, edited_at = NOW() WHERE message_id = ?')->execute([$text, $id]);
    $pdo->commit();
    if ($who === 'staff') audit($ownerId, 'message.edit', 'message', $id);
    json_success('Message edited.');
}

// What the pages get about a message's file (never the file itself; it's downloaded separately).
function message_file(array $m): ?array
{
    if (empty($m['file_name'])) return null;
    return ['id' => (int) $m['message_id'], 'name' => $m['file_name'], 'size' => (int) $m['file_size'], 'type' => $m['file_type']];
}

// The report case card staff attached to a message, or null.
function message_case(array $m): ?array
{
    if (empty($m['report_no'])) return null;
    return [
        'reportNo' => (int) $m['report_no'],
        'caseId' => $m['case_id'],
        'category' => $m['category'],
        'status' => $m['report_status'],
        'submittedAt' => $m['report_datetime'],
    ];
}

// Short text for a chat in the list of chats
function preview_text(array $m): string
{
    if ($m['deleted_at'] !== null) return 'Message deleted';
    if ($m['message_text'] !== '') return $m['message_text'];
    return $m['file_name'] ? 'File: ' . $m['file_name'] : 'Report case';
}
