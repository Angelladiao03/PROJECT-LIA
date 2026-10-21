# LagroInAction (LIA) — project context for Claude

## What this is
Capstone study: **"Development and Evaluation of LagroInAction (LIA): A Web-Based Bullying
Incident Reporting and Case Management System for Lagro High School"** (Design and Innovation
subject, Lagro High School, SDO Quezon City).

Team "Innovators": Culajara, Kurt Vinz D.; Francisco, Precious Rhian Brien R.;
Ladiao III, Angel O.; Ocampo, Sheldrick John E.

## Current state of the code
- **PHP alpha.** The backend was ported from Java to plain PHP 8.3 (no framework). The Java
  prototype is preserved under the Git tag `prototype-v1.2.1`.
- Stack: PHP 8.3 + PDO (`pdo_pgsql`), PostgreSQL on **Neon**, plain HTML/CSS/vanilla JS,
  deployed to **Render** via `Dockerfile` (php:8.3-apache, document root `public/`).
- Layout: `public/` = web root (`index.html`, `src/` pages, `api/*.php` endpoints);
  `includes/` = private helpers (`bootstrap.php`, `db.php`, `session.php`, `json.php`,
  `validation.php`, `passwords.php`). Every endpoint starts with
  `require_once __DIR__ . '/../../includes/bootstrap.php';`.
- DB connection: `DATABASE_URL` env var (Render) or `includes/config.local.php` (local, gitignored).
  Never hard-code credentials.
- Sessions are stored in the `php_sessions` table (Render's disk is ephemeral).
- API responses keep the Java prototype's JSON shapes (all values as strings) so the existing
  frontend works. Admin GET endpoints return 401 + `sessionExpired` when not logged in.
- Rules for new code: prepared statements only; `password_hash`/`password_verify`;
  `require_admin()` on every admin endpoint; validate input server-side; never send raw DB
  errors to the browser (use `json_server_error`).
- Run locally: `php -S localhost:8000 -t public`. The team are students learning as they go:
  keep code simple and commented, and explain changes in plain language.

## User roles (target design)
- **Student:** submit a regular or SOS report (optional anonymity), track status, message the
  guidance advocate assigned to their grade level.
- **Guidance Advocates/Associates:** manage reports and SOS; message access limited to their grade level.
- **Guidance Counselor:** dashboards, high-severity cases, all records, SOS, can view all messages.
- **Security Respondents:** track SOS; may message advocates about SOS (still to be discussed).
- **Principal:** view dashboards and insights only.

## Required features (scope, Chapter 1)
- Registration with admin approval and acceptance of data-privacy terms
- Regular and SOS reports, optional anonymity; staff notified on submission
- Case tracking from submission to resolution, with status visible to the student
- Student–guidance messaging
- Formal invitation letters and printable/PDF case records
- Dashboard by month and by category
- "What counts as bullying" guide and an emergency hotlines list

## Must-fix rules (consultant feedback, Oct 2026) — follow these in new code
- **One login per staff member.** No shared admin account ("adminlia"), so every action is attributable.
- **Archive, never delete** reports or cases. Keep an audit log of who changed what, and when.
- **Anonymity must be accurate.** Either fully unlinked from the account (give the student a
  tracking code to follow up), or described as "identity hidden from staff". An "anonymous"
  report must not appear in My Report History if it is meant to be unlinked.
- Show a privacy notice and collect consent at sign-up (RA 10173, Data Privacy Act; the users are minors).
- Development and testing use **made-up cases only**. In the pilot, only guidance staff hold
  admin and database access.

## Planned improvements (priority order)
1. Case flow aligned to the revised RA 10627 IRR (2025): submitted → guidance review → approved
   with **severity** (Minor: adviser/teacher; Serious: Learner Formation Officer; Severe: school
   head, parents, PNP) or **Rejected with a reason the student can see** → resolved with the
   action taken → archived. Add severity, assigned person, and a Rejected status.
2. "Victim or witness?" field; **location dropdown** (fixed list, used for a hotspot chart)
3. SOS sound alert on staff screens (SMS if possible); clarify what "Dispatch Guard" does
4. Screenshot/evidence upload; auto-verify LRN against the school's list
5. Nice to have: monthly trend as bars, not a curved line; rename "Scan Details" to "View Details"
6. Out of scope: separate mobile app, AI features

## Evaluation
The system will be evaluated with ISO/IEC 25010 (functional suitability, reliability, usability,
security) by students, guidance personnel, and IT experts. Build with these qualities in mind:
input validation, role-based access checks on every endpoint, and clear confirmations and errors.
