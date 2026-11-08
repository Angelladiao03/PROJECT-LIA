<?php
// Staff: chats with students and guests, grouped by case.
//
// GET                 -> list of chats (newest message first)
// GET ?case=12        -> the chat about report #12 (works for anonymous reports too: the reporter
//                        gets the messages, staff never learn who they are)
// GET ?user=5         -> the general chat with account 5 (questions not about one report)
// POST case=12 | user=5, text, file (optional), reportNo (optional, general chat only)
//                     -> send a message. A file can be a form for the student to fill up (PDF, Word, JPG, PNG; 5 MB).
//                        reportNo attaches a case card (only reports with the student's name shown).
// POST action=edit   id, text   -> edit one of your own messages
// POST action=delete id         -> delete one of your own messages (hidden, never erased)
//
// Counselor: every chat. Advocate: chats about reports of their grade level, and general chats
// with students of their grade level. (Guests have no grade level: their general chats go to the counselor.)

require_once __DIR__ . '/../../../includes/bootstrap.php';
require_method('GET', 'POST');
$admin = require_admin('counselor', 'advocate');
$myId = (int) $admin['admin_id'];

// Works out which chat a request is about, checks this staff member may open it, and
// returns ['userId', 'caseNo', 'info' => what the page shows at the top of the chat].
function open_thread(array $admin, ?int $caseNo, ?int $userId): array
{
    if ($caseNo !== null) {
        $stmt = db()->prepare(
            'SELECT r.report_no, r.case_id, r.user_id, r.is_anonymous, r.category, r.report_status, r.grade_level,
                    u.account_type, u.guest_id, u.full_name, u.status AS account_status
             FROM reports r LEFT JOIN users u ON u.user_id = r.user_id WHERE r.report_no = ?'
        );
        $stmt->execute([$caseNo]);
        $r = $stmt->fetch();
        if (!$r || !staff_sees_grade($admin, $r['grade_level'])) json_error('That report was not found.', 404);
        if ($r['user_id'] === null) json_error('This old report is not linked to an account, so it has no chat.', 409);
        $anonymous = (bool) $r['is_anonymous'];
        return ['userId' => (int) $r['user_id'], 'caseNo' => $caseNo, 'info' => [
            'key' => "case-$caseNo",
            'kind' => 'case',
            'reportNo' => $caseNo,
            'caseId' => $r['case_id'],
            ...chat_state($caseNo), // closed = read-only; closing = Resolved/Rejected, closes after 3 quiet days
            'anonymous' => $anonymous,
            // never send the account of an anonymous reporter to the browser
            'userId' => $anonymous ? null : (int) $r['user_id'],
            'name' => $anonymous ? 'Anonymous reporter' : display_name($r),
            'accountType' => $anonymous ? null : $r['account_type'],
            'category' => $r['category'],
            'status' => $r['report_status'],
            'gradeLevel' => $r['grade_level'] !== null ? (int) $r['grade_level'] : null,
            'expired' => $r['account_status'] === 'Expired',
        ]];
    }
    if ($userId === null) json_error('Choose a chat first.');
    $user = find_user($userId);
    if (!$user || !staff_sees_grade($admin, $user['grade_level'])) json_error('That chat is handled by another staff member.', 404);
    return ['userId' => $userId, 'caseNo' => null, 'info' => [
        'key' => "user-$userId",
        'kind' => 'general',
        'reportNo' => null,
        'caseId' => null,
        'closed' => false,
        'closing' => false,
        'anonymous' => false,
        'userId' => $userId,
        'name' => display_name($user),
        'accountType' => $user['account_type'],
        'gradeLevel' => $user['grade_level'] !== null ? (int) $user['grade_level'] : null,
        'expired' => $user['status'] === 'Expired',
    ]];
}

$caseParam = $_SERVER['REQUEST_METHOD'] === 'POST' ? input('case') : (string) ($_GET['case'] ?? '');
$userParam = $_SERVER['REQUEST_METHOD'] === 'POST' ? input('user') : (string) ($_GET['user'] ?? '');

// ----- POST -----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = input('action');
    if ($action === 'edit' || $action === 'delete') edit_or_delete_message($action, ['staff' => $myId]);

    $t = open_thread($admin, $caseParam === '' ? null : positive_int($caseParam), $userParam === '' ? null : positive_int($userParam));
    $reportNo = input('reportNo') === '' ? null : positive_int(input('reportNo'));
    if (input('reportNo') !== '' && $reportNo === null) json_error('Choose a report to attach.');
    if ($reportNo !== null) {
        // Case cards only in the general chat, and only reports that show the student's name
        // (attaching an anonymous report would reveal who sent it).
        $stmt = db()->prepare('SELECT grade_level, case_id FROM reports WHERE report_no = ? AND user_id = ? AND is_anonymous = FALSE');
        $stmt->execute([$reportNo, $t['userId']]);
        $card = $stmt->fetch();
        if ($t['caseNo'] !== null || !$card || !staff_sees_grade($admin, $card['grade_level'])) {
            json_error('That report cannot be attached to this chat.', 403);
        }
    }
    $file = read_attachment(); // optional (multipart field "file")
    $text = message_text_input(!$file && $reportNo === null);
    if ($text === '' && $reportNo !== null) $text = "Follow-up on your report #{$card['case_id']}.";

    save_message($t['userId'], $myId, 'Admin', $text, $file, $t['caseNo'], $reportNo);
    json_success($reportNo ? "Report #{$card['case_id']} sent." : ($file ? 'File sent.' : 'Sent.'));
}

// ----- GET one chat -----
if ($caseParam !== '' || $userParam !== '') {
    $t = open_thread($admin, $caseParam === '' ? null : positive_int($caseParam), $userParam === '' ? null : positive_int($userParam));
    send_json([
        'success' => true,
        'thread' => $t['info'],
        'messages' => array_map(fn ($m) => message_out($m, 'staff', $myId), thread_messages($t['userId'], $t['caseNo'])),
    ]);
}

// ----- GET the list of chats -----
// The newest message of each chat (a chat = one account + one case, or the account's general chat)
close_quiet_chats(); // so the "Closed" labels are up to date
$grade = staff_grade($admin);
$stmt = db()->prepare(
    "SELECT last.*, u.account_type, u.guest_id, u.full_name, u.grade_level AS user_grade,
            r.is_anonymous, r.grade_level AS case_grade, r.category, r.case_id, r.report_status, r.chat_closed_at
     FROM (
         SELECT DISTINCT ON (m.user_id, m.case_no) m.user_id, m.case_no, m.message_text, m.file_name,
                m.deleted_at, m.sent_datetime, m.sender_type
         FROM messages m
         ORDER BY m.user_id, m.case_no, m.sent_datetime DESC, m.message_id DESC
     ) last
     JOIN users u ON u.user_id = last.user_id
     LEFT JOIN reports r ON r.report_no = last.case_no
     WHERE CAST(? AS INT) IS NULL
        OR (last.case_no IS NOT NULL AND r.grade_level = CAST(? AS INT))
        OR (last.case_no IS NULL AND u.grade_level = CAST(? AS INT))
     ORDER BY last.sent_datetime DESC"
);
$stmt->execute([$grade, $grade, $grade]);

send_json(['success' => true, 'threads' => array_map(function ($r) {
    $isCase = $r['case_no'] !== null;
    $anonymous = $isCase && $r['is_anonymous'];
    return [
        'key' => $isCase ? 'case-' . $r['case_no'] : 'user-' . $r['user_id'],
        'kind' => $isCase ? 'case' : 'general',
        'reportNo' => $isCase ? (int) $r['case_no'] : null,
        'caseId' => $isCase ? $r['case_id'] : null,
        'closed' => $isCase && $r['chat_closed_at'] !== null,
        'userId' => $anonymous ? null : (int) $r['user_id'],
        'anonymous' => $anonymous,
        'name' => $anonymous ? 'Anonymous reporter' : display_name($r),
        'accountType' => $anonymous ? null : $r['account_type'],
        'category' => $isCase ? $r['category'] : null,
        'lastText' => preview_text($r),
        'lastAt' => $r['sent_datetime'],
        'waitingForReply' => $r['sender_type'] === 'Student' && $r['deleted_at'] === null,
    ];
}, $stmt->fetchAll())]);
