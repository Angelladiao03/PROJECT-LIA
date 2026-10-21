# LagroInAction (PROJECT LIA)

LagroInAction is a web-based bullying incident reporting and case management
system for Lagro High School. Students can report incidents (named or
anonymous), send an SOS alert, track their reports, and message the guidance
office. Guidance staff get a dashboard to review reports, respond to SOS
alerts, approve new student accounts, and reply to students.

> **Version:** PHP alpha (rewrite of the Java prototype). The original Java
> version is saved in Git under the tag `prototype-v1.2.1`.

## Tech stack

- **Backend:** PHP 8.3 (plain PHP, no framework) with PDO
- **Database:** PostgreSQL, hosted on [Neon](https://neon.tech)
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Hosting:** [Render](https://render.com), using the `Dockerfile`

## Project structure

```
PROJECT-LIA/
├── public/                 ← everything the browser can open
│   ├── index.html          ← login / sign-up page
│   ├── src/                ← student and admin pages (HTML, CSS, JS)
│   └── api/                ← PHP endpoints the JavaScript calls
│       ├── login.php            student login
│       ├── admin_login.php      admin login
│       ├── logout.php           log out
│       ├── register.php         student sign-up
│       ├── report.php           submit an incident report
│       ├── my_reports.php       student's own reports
│       ├── sos.php              send an SOS alert
│       ├── messages.php         student messages
│       ├── student_profile.php  student "My Account"
│       ├── admin_reports.php    admin: reports + SOS (view, approve, resolve...)
│       ├── admin_requests.php   admin: approve/reject new accounts
│       └── admin_messages.php   admin: messages
├── includes/               ← private PHP code (not reachable from the browser)
│   ├── bootstrap.php       loads everything below
│   ├── config.php          finds the database connection string
│   ├── db.php              connects to PostgreSQL
│   ├── session.php         login sessions (saved in the database)
│   ├── passwords.php       password hashing
│   ├── validation.php      form validation rules
│   ├── json.php            sends JSON responses
│   ├── students.php        shared student queries
│   └── conversations.php   shared message queries
├── schema.sql              creates the database tables
└── Dockerfile              how Render builds and runs the site
```

## Running it on your computer (Windows)

### 1. Install PHP

1. Download PHP 8.3 for Windows (**VS17 x64 Thread Safe**, zip) from
   <https://windows.php.net/download/>.
2. Unzip it to `C:\php`.
3. In `C:\php`, copy `php.ini-development` and rename the copy to `php.ini`.
4. Open `php.ini` in Notepad and remove the `;` at the start of these lines:
   ```
   extension_dir = "ext"
   extension=mbstring
   extension=pdo_pgsql
   extension=openssl
   ```
5. Add `C:\php` to your PATH (Start → "Edit the system environment
   variables" → Environment Variables → Path → New → `C:\php`).
6. Open a **new** terminal and check: `php -v`

### 2. Connect to your Neon dev database

1. In Neon, open your project → **Branches** → `dev` → **Connect**, and copy
   the connection string.
2. In `includes/`, copy `config.local.example.php` and name the copy
   `config.local.php`.
3. Paste the connection string into `config.local.php`.

`config.local.php` is in `.gitignore`, so your password is never uploaded to
GitHub. **Never put the connection string anywhere else in the code.**

### 3. Set up the tables (first time only)

In Neon, open the **SQL Editor** (on the `dev` branch), paste the whole
`schema.sql`, and click **Run**. It's safe to run again later; it only creates
what's missing.

To make an admin account, run this in the SQL Editor (use your own values):

```sql
INSERT INTO admin_profile (admin_username, admin_password, admin_fullname)
VALUES ('yourusername', 'TemporaryPass123', 'Your Full Name');
```

The password is converted to a secure hash the first time you log in.

### 4. Start the site

In VS Code, open a terminal in the project folder and run:

```
php -S localhost:8000 -t public
```

Then open <http://localhost:8000> in your browser. Press `Ctrl+C` in the
terminal to stop it.

## Deploying to Render

1. In Render, open the web service → **Settings** and make sure it uses
   **Docker** and the `Dockerfile` in the project root.
2. Go to **Environment** and add:
   - `DATABASE_URL` = your Neon **main/production** connection string
     (must include `sslmode=require`).
   - You can delete the old Java variables `DB_URL`, `DB_USER`, and
     `DB_PASSWORD`.
3. Run `schema.sql` once in Neon's SQL Editor on the **production** branch
   (this adds the new `php_sessions` table).
4. Push to GitHub. Render rebuilds automatically.

## Security notes

- All database queries use prepared statements (protects against SQL injection).
- Passwords are stored as hashes. Old plain-text passwords from the prototype
  are upgraded automatically when that person logs in.
- Login sessions are kept in the database, so a Render restart doesn't log
  everyone out. Session cookies are `HttpOnly` and `SameSite=Lax`.
- Only `public/` is reachable from the web; `includes/` stays private.
- Use **made-up test data only** while developing.

## Known items still to do

See `CLAUDE.md` for the full list. The most important:

- Separate login per staff member (no shared admin account)
- "Reject" and "Delete" currently delete a report; change these to a
  Rejected status plus archiving, with an audit log
- Decide how anonymous reports work (unlinked + tracking code, or
  "identity hidden from staff")
- Privacy notice and consent at sign-up
