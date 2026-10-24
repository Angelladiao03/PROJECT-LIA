# LagroInAction (PROJECT LIA)

LagroInAction is a web-based bullying incident reporting and case management
system for Lagro High School. Students report bullying (as guests or with a
permanent student account), follow their reports, send SOS alerts, and
message the guidance office. Guidance staff review cases, respond to SOS
alerts, approve student accounts, and see where bullying happens.

> **Version:** PHP alpha. The original Java prototype is saved in Git under
> the tag `prototype-v1.2.1`.

## How accounts work

| Account | How you get it | Signs in with | Lasts |
|---|---|---|---|
| **Guest** | Accept the Terms → verify email with a 6-digit code | Guest ID (e.g. `LIA-7K3P9Q`) + password | 30 days, longer while a report or request is open. Reports are always kept. |
| **Student** | A guest asks for it (details + school ID photo); staff approve | Username or email + same password | Permanent |
| **Staff** | Created in the database (see below) | Staff username + password | Permanent |

- Guest reports are always anonymous. Student accounts can turn on
  **"Hide my name from staff"** (the report stays linked to the account so the
  student can track it; staff can't see who sent it).
- The ID photo is only visible to staff and is **deleted as soon as they
  approve or decline**. The student is emailed the result.

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
│   ├── index.html              sign in (Student / Guest)
│   ├── guest.html              create a guest account (Terms → email → code → done)
│   ├── staff.html              guidance staff sign in
│   ├── terms.html              Terms of Use & Privacy Notice (EXAMPLE DRAFT)
│   ├── app/                    student & guest pages
│   │   ├── home.html           feed: report box, posters, articles, videos, hotlines
│   │   ├── report.html         report an incident
│   │   ├── reports.html        old link, now opens My Account → My Report History
│   │   ├── messages.html       chat with the guidance office
│   │   ├── account.html        profile (Edit Profile, password, log out), report history,
│   │   │                       request a permanent account
│   │   └── guide.html          what counts as bullying, what to do
│   ├── admin/                  guidance staff pages
│   │   ├── home.html           staff home page (same layout as the student home)
│   │   ├── index.html          dashboard (counts, monthly bars, hotspots)
│   │   ├── cases.html          Manage Reports: new reports, active cases, SOS alerts (with sound)
│   │   ├── records.html        resolved / rejected / archived
│   │   ├── messages.html       conversations (+ student info and linked cases)
│   │   └── accounts.html       permanent-account requests (ID photo review)
│   ├── assets/
│   │   ├── css/lia.css         all styles (colours and sizes are at the top)
│   │   ├── js/core.js          shared code: top bar, side menu, SOS, API calls
│   │   ├── js/pages/*.js       code for individual pages (admin-case.js = the case details window)
│   │   └── img/                seal, posters, favicon
│   └── api/                    PHP endpoints the pages call
│       ├── auth/               me, login, staff_login, logout
│       ├── guest/              send_code, verify
│       ├── account/            password, activation, profile
│       ├── reports/            create, mine
│       ├── sos/                create
│       ├── messages/           thread
│       └── admin/              reports, sos, messages, activations
├── includes/                   ← private PHP code (not reachable from the browser)
│   ├── bootstrap.php           loads everything below
│   ├── config.php              reads settings (DATABASE_URL, email keys)
│   ├── db.php                  connects to PostgreSQL
│   ├── session.php             sign-in sessions (saved in the database)
│   ├── accounts.php            who is signed in, guest expiry, login lockout
│   ├── mailer.php              sends email through Brevo
│   ├── passwords.php           password hashing
│   ├── validation.php          form checks + the category/location lists
│   └── json.php                JSON responses
├── docker/apache-lia.conf      caching + security headers
├── schema.sql                  creates/updates the database tables
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

### Staff accounts

Each staff member gets their own account (so every action shows who did it).
Run this in the SQL Editor, once per person:

```sql
INSERT INTO admin_profile (admin_username, admin_password, admin_fullname)
VALUES ('reyes.guidance', 'TemporaryPass123', 'Ms. Reyes');
```

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

Every email the system tries to send is listed in the `email_outbox` table
(address, subject, sent time, or the error), which helps if someone says they
didn't get a code. The email text itself is not stored.

## Security and privacy (what to tell the panel)

- **Passwords** are hashed (`password_hash`). Old plain-text passwords from the
  prototype are upgraded when that person signs in.
- **Wrong-password lockout:** 5 wrong tries in 15 minutes locks that account
  for 15 minutes.
- **Email codes** expire after 10 minutes, allow 5 tries, and are limited to
  one per minute per email.
- **Every query uses prepared statements** (no SQL injection).
- **Role checks on every endpoint:** students only see their own data; staff
  pages need a staff account.
- **Requests from other websites are blocked** (`X-LIA` header + `SameSite`
  cookies), sessions are `HttpOnly`, and the session ID changes at sign-in.
- **Anonymous reports** never send the reporter's details to staff browsers.
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
- Use **made-up test data only** while developing.

## Still to do

See `CLAUDE.md` for the full list. Biggest items: severity levels and
assigned staff (revised RA 10627 IRR), staff
roles (counselor / advocate / security / principal), evidence uploads, and
final approval of the Terms by the adviser and the Guidance Office.
