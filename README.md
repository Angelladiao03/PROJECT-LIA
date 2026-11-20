<p align="center">
  <img src="public/assets/img/lagro-seal.png" alt="Lagro High School seal" width="96">
</p>

<h1 align="center">LagroInAction (LIA)</h1>

<p align="center">
  <b>A Web-Based Bullying Incident Reporting and Case Management System for Lagro High School</b><br>
  Lagro High School · Schools Division Office of Quezon City · National Capital Region
</p>

<p align="center"><i>Version 1.0.0-alpha.8</i></p>

---

## About

**LagroInAction (LIA)** is a web-based system through which students of Lagro High School can report
bullying incidents to the Guidance Office, monitor the status of their reports, send emergency SOS alerts,
and communicate privately with guidance personnel. For the Guidance Office, LIA provides one place to
receive, review, track, and document bullying cases from submission to resolution.

LIA was developed as a capstone study for the Design and Innovation subject:

> **"Development and Evaluation of LagroInAction (LIA): A Web-Based Bullying Incident Reporting and
> Case Management System for Lagro High School"**

LIA is a tool for reporting, tracking, and case management. It **complements, and does not replace,** the
work of the Guidance Office, including counseling sessions and the school's established procedures for
resolving cases.

## Background

At Lagro High School, bullying incidents are reported and recorded manually: a student goes to the
Guidance Office, waits for an available staff member, and fills out a paper form. Many students are
hesitant to report in person, and paper records are difficult to organize and monitor.

National studies continue to show bullying as a serious and persistent problem in Philippine schools. The
Anti-Bullying Act of 2013 (Republic Act No. 10627), its revised Implementing Rules and Regulations, and
the DepEd Child Protection Policy require schools to receive, act on, and document reports of bullying.
LIA was designed to make reporting more accessible and confidential for students, and to make case
handling more organized for the Guidance Office.

## Features

### For students and guests

- **Two kinds of accounts.** A *guest account* requires only an email address and a mobile number and is
  valid for 30 days. A guest may request a *permanent student account*, which the Guidance Office approves
  after verifying the student's school ID.
- **Incident reporting.** Students report an incident by category, location, date, and description, and
  state whether they were the victim, a witness, or another party.
- **Anonymity.** Guest reports are always anonymous. Students choose between *Include My Identity* (the first
  choice) and *Submit Anonymously*, which hides their name from staff; the form states exactly what staff will
  see, and the report remains in their own report history so that they can monitor it.
- **SOS alerts** for urgent situations, with the student's current location.
- **Report history and status tracking** from submission to resolution, with the reason shown if a report
  is not accepted. Every report has an ID such as **#2026-0001** (the year and its number within that year).
- **Follow-up reports.** If an incident happens again, a student may link a new report that includes their
  identity to an earlier resolved report that also included it, so that the Guidance Office can connect the cases.
- **Private messaging** with the Guidance Office: one conversation per report and a general conversation,
  with file attachments. Usage guidelines are shown before a student messages the Guidance Office. After a report
  is resolved or rejected, guidance staff may close its conversation when there are no further questions (and
  reopen it if needed); a closed conversation remains available to read.
- **Learning resources:** the definition of bullying under RA 10627, the kinds of bullying, what to do as
  a victim, witness, or person who has bullied someone, anti-bullying posters, articles, and videos.
- **Crisis hotlines:** 911, the Quezon City Helpline (122), the NCMH Crisis Hotline (1553), and Hopeline.
- **Email notifications** for verification codes, account decisions, report status updates, and unread
  messages, in one formal layout with a password-reset link and a "do not reply" notice. Emails never
  contain report details or message contents.

### For school personnel

Each staff member has an individual account, so every action is recorded under the person who performed it.

| Role | Access |
|---|---|
| **Guidance Counselor** | All reports, case records, registration requests, SOS alerts, and student conversations of every grade level, plus the dashboard |
| **Guidance Advocates** | Reports, case records, registration requests, and student conversations of their assigned grade level, plus every SOS alert |
| **Principal** | Dashboard of totals and trends (no names or case details) |
| **Security Personnel** | To be finalized |
| **All personnel** | Home page, staff-to-staff messaging, and account settings |

- **New report and SOS emails.** The guidance advocate of a report's grade level is emailed when a new report
  is submitted; the Guidance Counselor and every advocate are emailed when an SOS alert is sent (to the email
  address each staff member adds in My Account). The emails contain no names or report details.
- **Case management.** Reports move through clear steps:

  ```
  Submitted  →  Accepted  →  Under Investigation  →  For Intervention  →  Resolved
                    │                                 or For Referral
                    └→  Not accepted (with a reason shown to the student)
  ```

  *For Referral* records the partner office the case was referred to (for example, the National Center
  for Mental Health or the Quezon City Social Services Development Department). Resolved and rejected
  reports are archived, never deleted.
- **SOS monitoring** with an audible alert (SOS in Morse code) on every staff page, and dispatch and
  response tracking.
- **Case history** of every action taken on a report, and printable case records and conversations
  (Print / Save as PDF). Statuses are changed only from the tables in Manage Reports, never from the
  details window, and every status change asks for confirmation first. Every table can be sorted by
  clicking a column heading.
- **Activity logs** on each staff member's account page: their own activity for every role, the activity of all
  staff for the Guidance Counselor, and a staff activity summary (totals only) for the Counselor and the Principal.
- **Dashboard** of reports by day, month, or year for any period, with filters (grade level, category,
  location, status, reporter type), comparison with the previous period, charts by location, category,
  grade level, reporter type, status, and day of the week, and a printable summary (totals only).
- **Registration review** of permanent student account requests.

## Privacy and security

LIA handles sensitive information about minors and was built in line with the **Data Privacy Act of 2012
(RA 10173)**:

- A Terms of Use and Privacy Notice must be accepted before an account is created.
- Students' personal details are shown to staff only after the staff member re-enters their password,
  and every such access is recorded.
- School ID photos are visible only to the Guidance Office and are deleted as soon as a request is approved
  or declined.
- Passwords are stored as secure hashes; repeated wrong passwords temporarily lock the account.
- Every staff action is recorded in an audit log, and reports and messages are never permanently deleted.
- Access is checked on the server for every request, according to each staff member's role and grade level.
- The site uses HTTPS and browser security protections against common web attacks.

## Technology

| Part | Technology |
|---|---|
| Front end | HTML, CSS, and JavaScript |
| Back end | PHP 8.5 |
| Database | PostgreSQL (Neon) |
| Email | Brevo |
| Hosting | Render |

The system is evaluated according to the **ISO/IEC 25010** software quality model: functional suitability,
reliability, usability, and security.

## How the system works

This section explains how LIA is organized, so that the team and future maintainers can study, maintain, and
extend the system. Every file in the project also begins with a comment that explains what it does.

### The three layers

```
  Browser                           Server                                Database
  (what people see)                 (PHP on Render)                       (PostgreSQL on Neon)
  ───────────────────────           ──────────────────────────            ──────────────────────────
  HTML pages    structure           public/api/   endpoints               tables such as users,
  lia.css       appearance  ─────►  includes/     shared rules  ─────►    reports, sos_alerts,
  JavaScript    behavior    ◄─────  (replies in JSON)           ◄─────    messages, and audit_log
```

- **Browser.** HTML gives each page its structure, one stylesheet (`lia.css`) decides how every page looks, and
  JavaScript fills the page with data and responds to clicks. The browser never connects to the database directly.
- **Server.** Each action has its own PHP file, called an *endpoint*; for example, `public/api/reports/create.php`
  saves a new report. An endpoint checks who is signed in and what that person may do, checks every field, reads or
  changes the database, and replies in **JSON**, a plain-text data format such as
  `{"success": true, "message": "Report submitted."}`. Code that many endpoints share is kept in `includes/`.
- **Database.** PostgreSQL keeps the accounts, reports, SOS alerts, messages, and the audit log. `schema.sql`
  creates every table and can be run again safely, because it only adds what is missing.

### What happens when a student submits a report

1. The browser opens `public/app/report.html`, which loads `lia.css`, `core.js`, and `pages/report.js`.
2. `LIA.start()` in `core.js` asks `api/auth/me.php` who is signed in. If no one is signed in, the browser is sent
   to the sign-in page; otherwise, the top bar, the menu, and the SOS button are drawn around the page.
3. The student completes the form and selects **Submit**. `report.js` sends the form to the server with
   `LIA.api('reports/create.php', ...)`.
4. On the server, `create.php` first loads `includes/bootstrap.php`, which loads every shared helper. It then
   confirms that the request came from LIA's own pages (`require_method`), confirms that a student is signed in
   (`require_user`), checks each field, and saves the report with a *prepared statement*, so that typed text can
   never change the database command.
5. The server replies in JSON, and the page shows the confirmation. Only after the reply is sent does the server
   email the guidance advocate of the student's grade level, if the advocate has added an email address
   (`after_response` in `includes/json.php`), so that the student does not wait for the email.
6. On every staff page, `core.js` asks `api/admin/counts.php` every 20 seconds for the numbers in the staff menu,
   so the new report is counted without reloading the page.

Staff requests follow the same steps, with three additions: staff endpoints use `require_admin(...)`, which also
checks the staff role; guidance advocates are limited to their assigned grade level (`staff_sees_grade()`); and
every staff action is written to the audit log (`audit()`), which is never edited or deleted.

### File structure

```
PROJECT-LIA/
├── README.md                     this file: about the system, its features, and how it works
├── CLAUDE.md                     development notes and the changes in each version
├── docs/
│   ├── SETUP.md                  setting up the database, running locally, deploying, and sending emails
│   └── HOW-IT-WORKS.md           a guide to reading the code, with examples
├── schema.sql                    creates and updates the database tables (safe to run again)
├── reset_test_data.sql           ERASES all data and adds made-up test accounts (development only)
├── Dockerfile                    how Render builds and runs the website (PHP 8.5 with Apache)
├── docker/apache-lia.conf        web server settings: caching and security headers
├── .gitignore, .dockerignore     files kept out of GitHub and out of the Render build
│
├── includes/                     private PHP code shared by the endpoints (cannot be opened from a browser)
│   ├── bootstrap.php             loads every file below; each endpoint begins by loading this file
│   ├── config.php                reads the settings: environment variables on Render, config.local.php locally
│   ├── config.local.example.php  a template for config.local.php (the real file is never committed)
│   ├── db.php                    the connection to PostgreSQL
│   ├── session.php               sign-in sessions, saved in the database
│   ├── accounts.php              who is signed in, staff roles and grade levels, guest expiry, sign-in lockout,
│   │                             and email changes with the 7-day waiting period
│   ├── passwords.php             password hashing and checking
│   ├── validation.php            checks for typed input, and the lists of categories, grade levels, and places
│   ├── json.php                  JSON replies, error replies, and work done after the reply is sent
│   ├── mailer.php                sends emails through Brevo, in one formal layout
│   ├── notify.php                notification emails: report updates, new reports, SOS alerts, unread-message
│   │                             reminders, and email changes
│   ├── messages.php              conversations by report and general: sending, editing, deleting, closing, reopening
│   ├── attachments.php           files sent in messages: allowed types, size limit, and a real file-type check
│   └── audit.php                 the audit log of staff actions
│
└── public/                       everything the browser can open
    ├── index.html                student and guest sign-in (the version number links to the staff sign-in)
    ├── staff.html                staff sign-in
    ├── guest.html                create a guest account: Terms → email and mobile number → code → done
    ├── reset.html                forgot password: request a link by email, then choose a new password
    ├── terms.html                Terms of Use and Privacy Notice
    │
    ├── app/                      pages for students and guests
    │   ├── home.html             the anti-bullying law, posters, articles, videos, and hotlines
    │   ├── report.html           Submit Report form
    │   ├── messages.html         conversations with the Guidance Office (one per report, plus a general one)
    │   ├── account.html          My Account: profile, password, permanent account request, and report history
    │   └── guide.html            what counts as bullying, and what to do
    │
    ├── admin/                    pages for school personnel
    │   ├── home.html             staff home page (the same resources as the student home page)
    │   ├── index.html            Dashboard (Guidance Counselor and Principal)
    │   ├── cases.html            Manage Reports: new reports, active cases, and SOS alerts
    │   ├── records.html          Report Records: resolved and rejected reports
    │   ├── messages.html         conversations about reports, with students, and between staff
    │   ├── accounts.html         Registration Requests for permanent student accounts
    │   └── account.html          staff My Account: profile, notification email, password, and activity logs
    │
    ├── assets/
    │   ├── css/lia.css           every style in one file (colors and sizes are defined at the top)
    │   ├── js/core.js            shared by every page: talking to the server, the top bar and menus, the SOS
    │   │                         button, pop-up windows, table sorting, page numbers, and the version number
    │   ├── js/chat.js            shared by both Messages pages: message bubbles, attachments, edit and delete
    │   ├── js/print.js           the "Print or Save as PDF" window (records, conversations, Dashboard summary)
    │   ├── js/pdf.js             creates PDF files in the browser without an outside library
    │   ├── js/pages/             the script of each page (pages not listed keep their script at the bottom
    │   │   │                     of the HTML file)
    │   │   ├── sign-in.js        index.html
    │   │   ├── guest.js          guest.html
    │   │   ├── reset.js          reset.html
    │   │   ├── home.js           app/home.html and admin/home.html
    │   │   ├── report.js         app/report.html
    │   │   ├── account.js        app/account.html
    │   │   ├── admin-dashboard.js  admin/index.html
    │   │   ├── admin-manage.js   admin/cases.html
    │   │   └── admin-case.js     the report details window (Manage Reports, Report Records, and Messages)
    │   ├── locations.json        the places in the Location lists (Submit Report and SOS)
    │   ├── referrals.json        partner offices for referrals, with their contact details (staff only)
    │   └── img/                  the school seal, posters, and site icon
    │
    └── api/                      the endpoints: each file is one action that the pages can request
        ├── auth/
        │   ├── me.php            who is signed in (every signed-in page asks this first)
        │   ├── login.php         student and guest sign-in
        │   ├── staff_login.php   staff sign-in
        │   ├── logout.php        sign out
        │   ├── reset_send.php    forgot password, step 1: email a one-time link
        │   └── reset_confirm.php forgot password, step 2: save the new password
        ├── guest/
        │   ├── send_code.php     guest sign-up: email a 6-digit code
        │   └── verify.php        guest sign-up: check the code and create the account
        ├── account/              a student's or guest's own account
        │   ├── profile.php       Edit Profile (students)
        │   ├── email.php         change the email (students), confirmed with a code sent to the new address
        │   ├── password.php      change the password
        │   └── activation.php    request a permanent student account
        ├── reports/
        │   ├── create.php        submit a report
        │   └── mine.php          the signed-in person's own reports
        ├── sos/create.php        send an SOS alert
        ├── messages/
        │   ├── thread.php        a student's or guest's conversations with the Guidance Office
        │   └── file.php          download a file attached to a message
        ├── admin/                school personnel only (each file checks the staff member and their role)
        │   ├── reports.php       reports: accept, change status, refer, reject, archive, and case history
        │   ├── sos.php           SOS alerts: dispatch and mark as responded
        │   ├── messages.php      conversations with students and guests
        │   ├── staff_chat.php    messages between staff members
        │   ├── activations.php   approve or decline permanent account requests
        │   ├── student.php       a student's personal details (after the staff member re-enters their password)
        │   ├── stats.php         Dashboard totals (no names or case details)
        │   ├── counts.php        the numbers in the staff menu and the SOS alert strip
        │   ├── activity.php      activity logs
        │   ├── account.php       staff My Account: profile and password
        │   └── email.php         add or change the staff notification email, confirmed with a code
        └── system/reminders.php  sends the unread-message reminder emails (for an optional scheduler)
```

### The database

| Table | What it keeps |
|---|---|
| `users` | student and guest accounts |
| `admin_profile` | staff accounts (one per person), with each role and grade level |
| `activation_requests` | requests for permanent student accounts (the ID photo is removed after the decision) |
| `reports` | incident reports and their status |
| `sos_alerts` | SOS alerts and their status |
| `messages`, `message_edits` | conversations with the Guidance Office, and earlier versions of edited messages |
| `staff_messages`, `staff_message_edits` | conversations between staff members, and earlier versions of edited messages |
| `audit_log` | every staff action: who did what, and when |
| `email_codes`, `password_resets` | email codes and password-reset links (only their hashes are saved) |
| `login_attempts` | wrong passwords, used to stop password guessing |
| `email_outbox` | a record of sent emails (the address and subject only, never the contents) |
| `php_sessions` | who is signed in |
| `app_state` | small values the server remembers, such as when the reminders last ran |

### Settings and secrets

Passwords and keys, such as the database address and the Brevo email key, are never written in the code. On
Render, they are set as environment variables; on a developer's own computer, they are placed in
`includes/config.local.php`, which is listed in `.gitignore` so that it is never uploaded to GitHub. Both are read by
`includes/config.php`.

### Learning more

- [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) explains the code step by step, including where to make common
  changes and the programming terms used in the code.
- [docs/SETUP.md](docs/SETUP.md) explains how to set up the database, run LIA on a computer, deploy it to Render,
  and set up emails.

## The team

**Team Innovators**, Grade 12 students of Lagro High School:

- Culajara, Kurt Vinz D.
- Francisco, Precious Rhian Brien R.
- Ladiao III, Angel O.
- Ocampo, Sheldrick John E.

Developed in consultation with the Lagro High School Guidance Office.

---

<p align="center">
  Lagro High School · Misa de Gallo St. corner Ascension Ave., Brgy. Greater Lagro, Novaliches, Quezon City<br>
  <sub>For the development team: technical documentation is in <a href="docs/SETUP.md">docs/SETUP.md</a>, and how the code works is explained in <a href="docs/HOW-IT-WORKS.md">docs/HOW-IT-WORKS.md</a>.</sub>
</p>
