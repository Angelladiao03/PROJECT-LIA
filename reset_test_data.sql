-- =====================================================================
-- LagroInAction - RESET TO TEST DATA
-- =====================================================================
-- WARNING: this ERASES EVERYTHING in the database (all accounts, reports,
-- SOS alerts, messages and logs) and cannot be undone.
-- Use it only while the system is being developed and tested.
-- It must NEVER be run once real students use LagroInAction.
--
-- How to use (Neon -> SQL Editor):
--   1. Run schema.sql first (so every table and column exists).
--   2. Paste this whole file and click Run.
--
-- Test accounts it creates (username / password):
--   Student            studentaccount     / studentaccount123     (Grade 10 - Section A)
--   Guest              guestaccount       / guestaccount123       (sign in on the Guest tab)
--   Guidance Counselor guidancecounselor  / guidancecounselor123  (all grade levels)
--   Principal          principal          / principal123          (dashboard + staff chat)
--   Grade 7 advocate   grade7advocate     / grade7advocate123
--   Grade 8 advocate   grade8advocate     / grade8advocate123
--   Grade 9 advocate   grade9advocate     / grade9advocate123
--   Grade 10 advocate  grade10advocate    / grade10advocate123
--   Grade 11 advocate  grade11advocate    / grade11advocate123
--   Grade 12 advocate  grade12advocate    / grade12advocate123
-- These passwords are public (they are in this file), so change them on the
-- My Account page, or delete these accounts, before any real use.
-- =====================================================================

BEGIN;

TRUNCATE staff_message_edits, staff_messages, message_edits, messages, password_resets, reports, sos_alerts, activation_requests,
         email_codes, login_attempts, email_outbox, php_sessions, app_state, audit_log,
         users, admin_profile
         RESTART IDENTITY CASCADE;

-- Staff (passwords are bcrypt hashes of the passwords listed above)
INSERT INTO admin_profile (admin_username, admin_password, admin_fullname, staff_role, grade_level) VALUES
  ('guidancecounselor', '$2y$10$c6ufkutbXCUAoQFOBNVJRuyBxO1z9CtpPxm3FUKhOlH8ktL7joINC', 'Guidance Counselor (Test)', 'counselor', NULL),
  ('principal',         '$2y$10$l9Tsw3yWRHU3eeTTGArPWesoF7O8AmxRieJs53NsdK3ihgocpY7Ze', 'Principal (Test)',          'principal', NULL),
  ('grade7advocate',    '$2y$10$WQ1Pr.LmWjnGyn.56ijRre/k6FA1PmW1GI2ghpIjhs7xSR61sqTaO', 'Grade 7 Advocate (Test)',   'advocate',  7),
  ('grade8advocate',    '$2y$10$4ZxC5nBHW8b7dDCQzrvw7ufgMVHh6T3.ASfcr41GRRHLA9yjjUk3a', 'Grade 8 Advocate (Test)',   'advocate',  8),
  ('grade9advocate',    '$2y$10$lbswT5YQQgZA4.Kd7ICXaO2YLxUGPjtOnDhYuvWHvOARCEGp8wCoS', 'Grade 9 Advocate (Test)',   'advocate',  9),
  ('grade10advocate',   '$2y$10$eozTBrtoqY2qA8NW7r/hd.jz4oh9yXsBSna3tpZvnBg8tegFzwurq', 'Grade 10 Advocate (Test)',  'advocate',  10),
  ('grade11advocate',   '$2y$10$mGCdK7wnL5W4DYWnGj10Quye1YykCQIkTdngdqvMYz6L0hlpuQmBW', 'Grade 11 Advocate (Test)',  'advocate',  11),
  ('grade12advocate',   '$2y$10$8xymZqYstHlWwK5OY59S1OngIiUQzbMO2QcTOo4iiz52rJ1MBN5Iy', 'Grade 12 Advocate (Test)',  'advocate',  12);

-- A permanent student account (made-up person)
INSERT INTO users (account_type, guest_id, username, email, password_hash, full_name, grade_level, section,
                   grade_section, adviser_name, contact_number, terms_version, terms_accepted_at)
VALUES ('student', 'LIA-STUDNT', 'studentaccount', 'studentaccount@example.com',
        '$2y$10$Z7XTwB5Fs7NxKXTVxTW4TO8oDBf1PDnRtB4JE75eG5kidBjnT.xDe',
        'Student Account (Test)', 10, 'Section A', 'Grade 10 - Section A', 'Adviser (Test)', '09000000001',
        'test-data', NOW());

-- A guest account. It signs in on the Guest tab with "guestaccount" (or its guest ID LIA-GUESTA).
-- Like every guest account it expires after 30 days if it has no open report.
INSERT INTO users (account_type, guest_id, username, email, password_hash, contact_number,
                   terms_version, terms_accepted_at, expires_at)
VALUES ('guest', 'LIA-GUESTA', 'guestaccount', 'guestaccount@example.com',
        '$2y$10$/reddvaYFnXZIB8tDhMZdOttTm62wkghXTnaVvU3.bQXo5KToLht.', '09000000002',
        'test-data', NOW(), NOW() + INTERVAL '30 days');

COMMIT;
