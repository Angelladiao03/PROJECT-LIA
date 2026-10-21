# LagroInAction (LIA) — project context for Claude

## What this is
Capstone study: **"Development and Evaluation of LagroInAction (LIA): A Web-Based Bullying
Incident Reporting and Case Management System for Lagro High School"** (Design and Innovation
subject, Lagro High School, SDO Quezon City).

Team "Innovators": Culajara, Kurt Vinz D.; Francisco, Precious Rhian Brien R.;
Ladiao III, Angel O.; Ocampo, Sheldrick John E.

## Current state of the code
- This repo (v1.2.1) is a **prototype**, not the final system. Expect large changes.
- Prototype stack: Java 17, Jakarta EE servlets, Maven, Tomcat 10+, PostgreSQL (`schema.sql`),
  plain HTML/CSS/vanilla JS.
- **Decision: the final backend moves from Java to PHP.** The frontend stays HTML/CSS/JS.
  When porting, map `com.lia.servlet.*` → PHP endpoints and `com.lia.dao.*` → PHP data-access
  classes using PDO with prepared statements.

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
