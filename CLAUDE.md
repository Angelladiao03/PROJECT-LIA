# LagroInAction (LIA) — project context for Claude

## What this is
Capstone study: **"Development and Evaluation of LagroInAction (LIA): A Web-Based Bullying
Incident Reporting and Case Management System for Lagro High School"** (Design and Innovation
subject, Lagro High School, SDO Quezon City).

Team "Innovators": Culajara, Kurt Vinz D.; Francisco, Precious Rhian Brien R.;
Ladiao III, Angel O.; Ocampo, Sheldrick John E.

## Current state of the code
- **PHP alpha.** Plain PHP 8.5 + PDO (`pdo_pgsql`), PostgreSQL on **Neon**, plain HTML/CSS/vanilla JS,
  deployed to **Render** via `Dockerfile` (php:8.5-apache, document root `public/`). Java prototype
  preserved under Git tag `prototype-v1.2.1`. README.md documents setup, structure and security.
- **Accounts** (table `users`): `guest` (email-verified, 30-day expiry, guest ID like `LIA-7K3P9Q`,
  stays open while a case/request is open, reports always kept) and `student` (permanent; a guest
  submits details + school ID photo in `activation_requests`, staff approve/decline, photo is set
  to NULL after the decision, result emailed). No LRNs are used (team can't get the LRN list).
  Staff use `admin_profile`, one account per person.
- Guest reports are always anonymous; students may choose "Hide my name from staff" (report stays
  linked to the account for their own tracking; staff never receive reporter details).
- Report statuses: Pending → Active → Under Investigation → Resolved, or Rejected (reason shown to
  student). Resolved/Rejected can be archived (`archived_at`); nothing is hard-deleted.
- Fixed lists (categories, locations, reporter roles) live in `includes/validation.php` and must
  match `public/app/report.html`.
- Layout: `public/` = web root (`index.html`, `guest.html`, `staff.html`, `terms.html`, `app/*`,
  `admin/*`, `assets/`, `api/<group>/*.php`); `includes/` = private helpers. Endpoints start with
  `require_once __DIR__ . '/../../../includes/bootstrap.php';` then `require_method(...)` and
  `require_user()` / `require_admin()`.
- Frontend: every signed-in page has `<body data-area="user|admin" data-page="...">`, includes
  `assets/js/core.js`, and calls `LIA.start()` (checks sign-in, builds top bar/sidebar/tab bar/SOS).
  Use `LIA.api()` for requests (adds the required `X-LIA: 1` header) and `LIA.esc()` for any
  database text put into HTML. All styles in `assets/css/lia.css` (tokens at the top).
- Settings via `setting()` in `includes/config.php`: env vars on Render (`DATABASE_URL`,
  `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`), `includes/config.local.php` locally
  (gitignored; `APP_ENV=development` shows email codes on screen when no mail service).
- `schema.sql` is idempotent and also migrates the v1 LRN database. Times are stored in UTC and
  shown in Asia/Manila time by `core.js`.
- Rules for new code: prepared statements only; `password_hash`/`password_verify`; role check on
  every endpoint; validate input server-side with plain-language messages; never send raw DB errors
  (`json_server_error`); never hard-delete case data; made-up test data only.
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
2. DONE: victim/witness field, location dropdown + hotspot chart, Rejected with reason, archive
   instead of delete, SOS sound + red strip for staff, monthly bars, "What counts as bullying" guide.
3. Still to do: severity + assigned staff (step 1 above), audit log of staff actions, staff roles
   (counselor / advocate by grade level / security / principal), evidence/screenshot upload,
   printable invitation letters, Terms approval by adviser + Guidance Office.
4. Out of scope: separate mobile app, AI features

## Evaluation
The system will be evaluated with ISO/IEC 25010 (functional suitability, reliability, usability,
security) by students, guidance personnel, and IT experts. Build with these qualities in mind:
input validation, role-based access checks on every endpoint, and clear confirmations and errors.
