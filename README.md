<p align="center">
  <img src="public/assets/img/lagro-seal.png" alt="Lagro High School seal" width="96">
</p>

<h1 align="center">LagroInAction (LIA)</h1>

<p align="center">
  <b>A Web-Based Bullying Incident Reporting and Case Management System for Lagro High School</b><br>
  Lagro High School · Schools Division Office of Quezon City · National Capital Region
</p>

<p align="center"><i>Version 1.0.0-alpha.6</i></p>

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
- **Anonymity.** Guest reports are always anonymous. Students may choose to hide their name from staff;
  the report remains in their own report history so that they can monitor it.
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
  messages. Emails never contain report details or message contents.

### For school personnel

Each staff member has an individual account, so every action is recorded under the person who performed it.

| Role | Access |
|---|---|
| **Guidance Counselor** | All reports, case records, registration requests, SOS alerts, and student conversations of every grade level, plus the dashboard |
| **Guidance Advocates** | Reports, case records, registration requests, and student conversations of their assigned grade level, plus every SOS alert |
| **Principal** | Dashboard of totals and trends (no names or case details) |
| **Security Personnel** | To be finalized |
| **All personnel** | Home page, staff-to-staff messaging, and account settings |

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
  (Print / Save as PDF). Every status change asks for confirmation first.
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
  <sub>For the development team: technical documentation is in <a href="docs/SETUP.md">docs/SETUP.md</a>.</sub>
</p>
