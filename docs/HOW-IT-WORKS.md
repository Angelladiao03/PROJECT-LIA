# How LagroInAction works

This guide is for the team. It explains how the code fits together, so you can read and change it
with confidence. The files themselves also have comments that explain each part. For setting up and
deploying, see [SETUP.md](SETUP.md).

## 1. The three layers

```
 Browser (what people see)            Server (PHP on Render)               Database (PostgreSQL on Neon)
 ─────────────────────────            ──────────────────────               ─────────────────────────────
 public/*.html  pages                 public/api/**/*.php  endpoints  ───► tables: users, reports,
 public/assets/css/lia.css  look      includes/*.php       helpers         messages, sos_alerts, ...
 public/assets/js/*.js  behaviour  ──► (answers with JSON)                 (schema.sql creates them)
```

- **HTML** gives each page its structure (headings, forms, empty tables).
- **CSS** (`lia.css`, one file) decides how everything looks.
- **JavaScript** fills the pages with data and reacts to clicks. It never talks to the database
  directly. It asks the **PHP endpoints**, which check who is asking and what they may do, read or
  change the database, and answer with **JSON** (data as text, like `{"success": true, "reports": [...]}`).

## 2. What happens when a signed-in page opens

Example: a student opens **My Account** (`public/app/account.html`).

1. The browser loads the HTML, `lia.css`, `core.js`, then `pages/account.js`.
2. `account.js` runs `const me = await LIA.start();` (in `core.js`):
   - `LIA.start()` calls `api/auth/me.php`. PHP reads the session cookie, finds the account and answers
     with its details. If no one is signed in, the browser is sent to the sign-in page.
   - It draws the top bar, the side menu and (on phones) the bottom tab bar around the page.
3. `account.js` asks for the data it needs: `LIA.api('reports/mine.php')`.
4. It builds HTML text from the data and puts it into the page (`element.innerHTML = ...`).
   Text from the database always goes through `LIA.esc(...)`, so it is shown as text and can never
   run as code.
5. It waits for clicks. A button that changes something sends a POST, for example
   `LIA.api('account/profile.php', { body: formData })`.

## 3. What happens on the server for one request

Example: `POST /api/reports/create.php` (Submit Report).

```php
require_once __DIR__ . '/../../../includes/bootstrap.php'; // 1. load every helper
require_method('POST');                                     // 2. right kind of request, from our own pages
$user = require_user();                                     // 3. who is signed in (stops if no one)
$category = input('category');                              // 4. read a field (always trimmed text)
if (!in_array($category, REPORT_CATEGORIES, true)) json_error('Choose what kind of bullying happened.');
$stmt = db()->prepare('INSERT INTO reports (...) VALUES (?, ?, ...)'); // 5. prepared statement
$stmt->execute([...]);
json_success('Report submitted. The Guidance Office will review it.');  // 6. JSON answer
```

- **`json_error('message')`** stops right there and sends `{"success": false, "message": "..."}`.
  `LIA.api()` turns that into an error, and the page shows the message.
- **Prepared statements**: the `?` marks are filled in by the database driver, so typed text can
  never change the SQL (this blocks "SQL injection").
- **Staff endpoints** use `require_admin('counselor', 'advocate')` instead, which also checks the role.
  Advocates are limited to their grade level with `staff_sees_grade()`.
- **Every staff change** calls `audit(...)`, which writes who did what, and when, into `audit_log`.
  That log is shown as the Case History and the activity logs, and it is never edited or deleted.

## 4. Where things are

| You want to change...                      | Look in                                                   |
|---|---|
| A page's text or layout                    | `public/.../*.html`                                       |
| Colours, sizes, spacing                    | `public/assets/css/lia.css` (colours are at the top, in `:root`) |
| The menus, the top bar, the SOS button     | `public/assets/js/core.js` (`USER_NAV`, `ADMIN_NAV`, `buildShell`) |
| What a page does                           | `public/assets/js/pages/<page>.js`, or the `<script>` at the bottom of the page |
| What the server checks and saves           | `public/api/<group>/<name>.php`                           |
| Shared server rules (roles, sessions...)   | `includes/*.php` (`includes/bootstrap.php` lists them)     |
| Locations / referral offices               | `public/assets/locations.json`, `public/assets/referrals.json` |
| Bullying categories                        | `includes/validation.php` and `public/app/report.html` (keep them the same) |
| The version number on the sign-in pages    | `VERSION` at the top of `core.js`                          |
| Email wording and layout                   | `includes/mailer.php` (layout), `includes/notify.php` and the endpoints (wording) |
| Database tables                            | `schema.sql` (safe to run again; it only adds what is missing) |

## 5. The database tables

| Table | What it keeps |
|---|---|
| `users` | student and guest accounts |
| `admin_profile` | staff accounts (one per person), role and grade level |
| `activation_requests` | guests asking for a permanent student account (the ID photo is removed after the decision) |
| `reports` | incident reports, their status and history fields |
| `sos_alerts` | SOS alerts and their status |
| `messages`, `message_edits` | chats between students and the Guidance Office (and earlier versions of edited messages) |
| `staff_messages`, `staff_message_edits` | chats between staff members |
| `audit_log` | every staff action (who, what, when) |
| `email_codes`, `password_resets` | sign-up codes and password reset links (only their hashes are saved) |
| `login_attempts` | wrong passwords, to block password guessing |
| `email_outbox` | which emails were sent (the address and subject, never the body) |
| `php_sessions` | who is signed in (sessions are kept in the database because Render's disk is wiped on restart) |
| `app_state` | small values the server remembers, e.g. when reminders last ran |

## 6. Words you will see in the code

- **`async` / `await`**: `await` waits for something slow (like the server) without freezing the page.
  A function that uses `await` must be marked `async`.
- **Template string**: text in backticks with `${...}` inside, e.g. `` `<b>${LIA.esc(name)}</b>` ``.
- **`data-...` attributes**: small labels on HTML elements, e.g. `<button data-view="12">`. Scripts
  read them with `button.dataset.view` to know which report a button is for.
- **Module pattern**: `const LIA = (() => { ... return { api, esc }; })();` - everything inside is
  private except what is returned (see the top of `core.js`).
- **Session**: how the server remembers who is signed in between requests (see `includes/session.php`).
- **Hash**: a one-way scramble of a password; it can be checked but not read back (see `includes/passwords.php`).

## 7. Trying it on your own computer

```
php -S localhost:8000 -t public
```

Then open <http://localhost:8000>. It needs `includes/config.local.php` with a database address
(see SETUP.md). Use `reset_test_data.sql` for made-up test accounts. Use made-up data only.
