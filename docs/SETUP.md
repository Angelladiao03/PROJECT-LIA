# LagroInAction: developer and setup guide

This guide is for the development team: how the code is organized, how to run it on a computer,
how to set up the database, and how the live site is deployed. For an introduction to the system,
see the [README](../README.md).

> Use **made-up test data only** while developing. Never put real student information in a test database.

## Tech stack

- **Backend:** PHP 8.5 (plain PHP, no framework) with PDO
- **Database:** PostgreSQL on [Neon](https://neon.tech)
- **Frontend:** HTML, CSS, vanilla JavaScript (one stylesheet, one shared script)
- **Email:** [Brevo](https://www.brevo.com) (free plan, 300 emails a day)
- **Hosting:** [Render](https://render.com), using the `Dockerfile`

## Project structure

```
PROJECT-LIA/
├── public/                     ← everything the browser can open
│   ├── index.html              sign in (Student / Guest). The version number in the corner opens staff log in
│   ├── guest.html              create a guest account (Terms → email + phone → code → done)
│   ├── reset.html              forgot password (username → link by email → new password)
│   ├── staff.html              guidance staff sign in
│   ├── terms.html              Terms of Use & Privacy Notice (EXAMPLE DRAFT)
│   ├── app/                    student & guest pages
│   │   ├── home.html           feed: report box, posters, articles, videos, hotlines
│   │   ├── report.html         report an incident
│   │   ├── reports.html        old link, now opens My Account → My Report History
│   │   ├── messages.html       chats with the guidance office: one per report + a general chat
│   │   ├── account.html        profile (Edit Profile, password, log out), report history,
│   │   │                       request a permanent account
│   │   └── guide.html          what counts as bullying, what to do
│   ├── admin/                  guidance staff pages
│   │   ├── home.html           staff home page (same layout as the student home)
│   │   ├── index.html          dashboard (period, filters, compare, charts, Print Summary)
│   │   ├── cases.html          Manage Reports: new reports, active cases, SOS alerts (with sound)
│   │   ├── records.html        resolved / rejected / archived
│   │   ├── messages.html       Reports / Students / Staff buttons: chats by case (anonymous reports too),
│   │   │                       general chats with students, and staff-to-staff chats
│   │   ├── accounts.html       permanent-account requests (ID photo review)
│   │   └── account.html        staff My Account (Edit Profile, Change Password)
│   ├── assets/
│   │   ├── css/lia.css         all styles (colours and sizes are at the top)
│   │   ├── js/core.js          shared code: top bar, side menu, SOS, API calls, loading line, VERSION
│   │   ├── js/pdf.js           makes PDF files in the browser (tables, page numbers), no library needed
│   │   ├── js/print.js         "Print or save as PDF" window used by Records, Messages and the case window
│   │   ├── js/chat.js          Messages: the "+" (Attach File / Attach Case), message bubbles, ⋮ Edit / Delete
│   │   ├── js/pages/*.js       code for individual pages (admin-case.js = the case details window)
│   │   ├── school-sections.json  the Section dropdown lists per grade (PLACEHOLDERS: put the real sections here)
│   │   ├── locations.json        the Location dropdown places (Submit Report + SOS); add places here
│   │   ├── referrals.json        offices a case can be referred to, with their contact details (staff only)
│   │   └── img/                seal, posters, favicon
│   └── api/                    PHP endpoints the pages call
│       ├── auth/               me, login, staff_login, logout, reset_send, reset_confirm
│       ├── guest/              send_code, verify
│       ├── account/            password, activation, profile
│       ├── reports/            create, mine
│       ├── sos/                create
│       ├── messages/           thread, file (download a file sent in a message)
│       ├── admin/              reports, sos, messages, activations, student (details behind a password),
│       │                       stats (dashboard), counts (menu numbers), account (staff My Account),
│       │                       staff_chat (staff-to-staff messages and their files)
│       └── system/             reminders (optional: for a free scheduler like cron-job.org)
├── includes/                   ← private PHP code (not reachable from the browser)
│   ├── bootstrap.php           loads everything below
│   ├── config.php              reads settings (DATABASE_URL, email keys)
│   ├── db.php                  connects to PostgreSQL
│   ├── session.php             sign-in sessions (saved in the database)
│   ├── accounts.php            who is signed in, guest expiry, login lockout
│   ├── mailer.php              sends email through Brevo
│   ├── notify.php              report-update emails + "you have unread messages" reminders
│   ├── attachments.php         files in messages: allowed types, 5 MB limit, checks the real file type
│   ├── messages.php            chats by case, sending, editing and deleting messages
│   ├── audit.php               audit log of staff actions
│   ├── passwords.php           password hashing
│   ├── validation.php          form checks + the category/location lists
│   └── json.php                JSON responses
├── docker/apache-lia.conf      caching + security headers
├── docs/SETUP.md               this guide
├── schema.sql                  creates/updates the database tables
├── reset_test_data.sql         ERASES everything and adds the test accounts (development only)
└── Dockerfile                  how Render builds and runs the site
```

## Setting up the database (do this after every schema change)

1. Open Neon → **SQL Editor** → choose the branch (`dev` for testing,
   your main branch for the live site).
2. Paste the whole `schema.sql` and click **Run**.

It's safe to run more than once. On the old (v1) database it also **converts
the old LRN-based student accounts** into the new accounts table, keeping their
usernames, emails and passwords, and links their old reports, SOS alerts and
messages. Nothing is deleted.

### Test accounts (development only)

`reset_test_data.sql` **erases everything** and creates made-up accounts: `studentaccount`, `guestaccount`,
`guidancecounselor`, `principal`, and `grade7advocate` … `grade12advocate`, each with the password
"username + 123" (e.g. `principal123`). Run `schema.sql` first. Never run it once real students use the system.

### Staff accounts

Each staff member gets their own account (so every action shows who did it).
Run this in the SQL Editor, once per person:

```sql
INSERT INTO admin_profile (admin_username, admin_password, admin_fullname, staff_role, grade_level)
VALUES ('reyes.guidance', 'TemporaryPass123', 'Ms. Reyes', 'advocate', 10);
```

`staff_role` is `counselor`, `advocate` (with its `grade_level`, 7 to 12) or `principal`.

The password becomes a secure hash the first time they sign in.

## Running it on your computer (Windows)

1. Install PHP 8.5 (see the steps in the team chat or windows.php.net, VS17 x64
   Thread Safe zip, unzip to `C:\php`, enable `pdo_pgsql`, `mbstring`, `openssl`
   in `php.ini`, add `C:\php` to PATH).
2. Copy `includes/config.local.example.php` to `includes/config.local.php` and
   fill in your Neon **dev** branch connection string. Keep
   `'APP_ENV' => 'development'`: without an email service, the verification
   code is shown on screen so you can still test sign-up.
3. Run `schema.sql` on the dev branch (see above) and create a staff account.
4. In VS Code's terminal, in the project folder:
   ```
   php -S localhost:8000 -t public
   ```
5. Open <http://localhost:8000>. Press `Ctrl+C` in the terminal to stop.

## Deploying to Render

1. In Neon, run `schema.sql` on your **main** branch.
2. In Render → your service → **Environment**, set:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon main branch connection string |
   | `BREVO_API_KEY` | your Brevo API key (see below) |
   | `MAIL_FROM_EMAIL` | the sender email you verified in Brevo |
   | `MAIL_FROM_NAME` | `LagroInAction` |
   | `PORT` | `10000` |
   | `CRON_KEY` | *(optional)* a long random word, only if you use cron-job.org for reminders (see below) |
   | `APP_URL` | *(optional)* the site address, e.g. `https://lagroinaction.onrender.com`, used in password reset links |

   Do **not** set `APP_ENV` on Render (it must stay "production").
3. Push to GitHub. Render rebuilds automatically.

### Sending emails (Brevo)

Guest sign-up needs email codes, and staff decisions send emails.

1. Create a free account at <https://www.brevo.com>.
2. Add and verify a **sender** email address (Brevo emails it a confirmation
   link). A school email is best; Gmail addresses work but more often land in
   spam.
3. Go to **SMTP & API → API keys**, create a key, and copy it.
4. Put the key and sender email in Render's Environment (above).

Emails the system sends:

| When | Subject |
|---|---|
| Guest sign-up | `[LagroInAction] Verification Code`, then `[LagroInAction] Guest Account Registration Successful` (with the guest ID, never the password) |
| Forgot password | `[LagroInAction] Password Reset Request` (button + link), then `[LagroInAction] Password Changed` |
| Student account approved / declined | `[LagroInAction] Student Account Request Approved` / `... Not Approved` (with the reason) |
| Staff change a report's status | `[LagroInAction] Update on Report #2026-0001` (new status only; no report details) |
| Guidance messages unread for 1 hour | `[LagroInAction] Unread Messages from the Guidance Office` (count only; once per message) |

All emails use one layout (`email_html()` in `includes/mailer.php`): school seal and name, title, a box with
"Dear ...", the message, a big code / status / button, "Thank you, LagroInAction", then "Please do not reply"
and the school address. A plain-text copy is sent too.

**Unread-message reminders.** Render's free plan has no scheduled jobs, so the reminder check runs
after normal website requests (at most every 10 minutes). If nobody uses the site for a while, a
reminder can be late. For exact timing, set `CRON_KEY` in Render and create a free job at
<https://cron-job.org> that opens `https://YOUR-SITE.onrender.com/api/system/reminders.php?key=YOUR_CRON_KEY`
every 10 minutes.

Every email the system tries to send is listed in the `email_outbox` table
(address, subject, sent time, or the error), which helps if someone says they
didn't get a code. The email text itself is not stored.

## Security and privacy details

- **Passwords** are hashed (`password_hash`). Old plain-text passwords from the
  prototype are upgraded when that person signs in.
- **Wrong-password lockout:** 5 wrong tries in 15 minutes locks that account
  for 15 minutes.
- **Email codes** expire after 10 minutes, allow 5 tries, and are limited to
  one per minute per email.
- **Forgot password** emails a one-time link (30 minutes, single use, only its hash is saved). The page
  shows the email partly hidden (`an**********01@gmail.com`).
- **Sign-in boxes** never fill in a saved username and password by themselves (shared school computers).
- **Every query uses prepared statements** (no SQL injection).
- **Role checks on every endpoint:** students only see their own data; staff
  pages need a staff account, and each staff role only gets what it needs (advocates: their grade level;
  principal: totals only).
- **Requests from other websites are blocked** (`X-LIA` header + `SameSite`
  cookies), sessions are `HttpOnly`, and the session ID changes at sign-in.
- **Anonymous reports** never send the reporter's name to staff browsers. Staff can message the reporter in
  the report's own chat, and can see only their phone number (after typing their password). The report form
  and the Terms say so.
- **Student details behind a password:** staff lists show only names; grade & section, adviser, email and
  phone need the staff member's password (unlocked for 10 minutes, every view logged).
- **Closing conversations:** when a report is Resolved or Rejected (`reports.finished_at`), its chat stays open
  until 3 days pass with no messages (counted from the status change or the last message, whichever is later).
  Then `close_quiet_chats()` (includes/messages.php) sets `reports.chat_closed_at` and adds an automatic notice
  (`messages.sender_type = 'System'`); the chat is read-only for everyone (checked on the server). It runs with the
  background jobs and whenever a report chat or report list is opened. Staff can print a conversation from Report
  Records ("Print Conversation").
- **Follow-up reports:** only a report that includes the student's identity can be linked, and only to the
  student's own earlier Resolved report that also included it (checked in `api/reports/create.php`). Guests'
  reports are always anonymous, so they cannot link. This way a link never reveals who sent an anonymous report.
- **Dashboard** (`api/admin/stats.php`, counselor and principal): `from`, `to`, `group=day|month|year`, filters
  `grade`, `category`, `location`, `status`, `role`, and `compare=1` (the same number of days/months/years just
  before). Reports are counted by the date submitted (Philippine time); "Day of the Week" uses the incident date.
  Only totals are returned. The page keeps the choices in the address bar and has "Print Summary".
- **Report IDs** (`#2026-0001`) are made by the database from the year and a number that restarts each year.
  The internal `report_no` is still used in links.
- **Messages** can be edited or deleted by their sender, but nothing is erased: deleted messages are hidden,
  earlier versions are kept in `message_edits` (staff chat: `staff_message_edits`), and staff edits/deletes
  are in the audit log. Staff chat files can only be downloaded by the two people in that chat.
- **Sign-in hint:** a guest ID (`LIA-7K3P9Q`) typed on the Student tab is refused with "sign in on the Guest
  tab" (student usernames can't have a "-", so it can't be a student). A guest username or a student account
  on the wrong tab is only told to switch tabs when the password is right, so it never reveals which accounts exist.
- **Chat rules pop-up:** before a student messages the Guidance Office, a pop-up says what the chat is for and
  what not to send (pranks, insults, unrelated files), and that messages are saved. "I understand" is needed
  once per browser tab.
- **Files in messages** (PDF, Word, JPG, PNG, up to 5 MB) are checked by their real contents, stored in
  the database, always downloaded (never opened inside the site), and only the student's own conversation
  or staff can download them.
- **One account per email and per phone number.** A used email or phone gets "already has an account"
  with links to sign in or reset the password.
- **ID photos** are checked to be real images, only shown to staff, never
  cached, and deleted after review.
- **Nothing is deleted:** reports are archived, accounts expire.
- **Audit log:** every staff action (accept, reject, resolve, archive, SOS
  dispatch, account approval, sign-in/out) is saved in `audit_log` with the
  staff member's name and the time. The case window shows it as "Case History".
- **Browser protection headers** (in `docker/apache-lia.conf`): a
  Content-Security-Policy (only our own scripts run), HSTS (always HTTPS),
  nosniff, no framing by other sites.
- **Fail-safe SOS:** if an SOS can't reach the server, the student is told it
  was NOT sent and is shown 911 / 122 and the guidance office.
- **SOS sound:** "beep - beep - beep", played twice (change `BEEP_LENGTH`, `BEEP_GAP`, `ROUND_GAP` in core.js). Browsers only allow sound after the person clicks or types on the page, so the sound
  switches on at the first click on any staff page. If an SOS arrives before that, the red strip shows a
  "Turn on sound" button. Each alert beeps once per browser tab, even when staff move between pages.
- **Crisis hotlines** (side menu, footer, SOS window): 911, Quezon City 122, NCMH Crisis Hotline 1553 and
  Hopeline, from the school's Referral Services sheet.
- Use **made-up test data only** while developing.
