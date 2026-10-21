-- =====================================================================
-- LagroInAction (LIA) database - version 2 (guest + student accounts)
-- =====================================================================
-- How to use: open Neon's SQL Editor, paste this WHOLE file, click Run.
--
-- It is safe to run more than once, and safe on both:
--   * a brand-new empty database (creates everything), and
--   * the old v1 database (adds the new tables/columns and converts the
--     old LRN-based student accounts into the new "users" table).
-- It never deletes data.
-- =====================================================================

-- ---------- Staff accounts (guidance office) ----------
CREATE TABLE IF NOT EXISTS admin_profile (
    admin_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_username VARCHAR(50)  NOT NULL UNIQUE,
    admin_password VARCHAR(255) NOT NULL,
    admin_fullname VARCHAR(150) NOT NULL
);

-- ---------- Student and guest accounts ----------
-- account_type: 'guest'   = created with just an email, expires after 1 month
--               'student' = permanent account, approved by the guidance office
-- status:       'Active' or 'Expired' (accounts are never deleted)
CREATE TABLE IF NOT EXISTS users (
    user_id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_type      VARCHAR(10)  NOT NULL DEFAULT 'guest'
                          CHECK (account_type IN ('guest', 'student')),
    guest_id          VARCHAR(12)  NOT NULL UNIQUE,      -- e.g. LIA-7K3P9Q
    username          VARCHAR(50)  UNIQUE,                -- students only
    email             VARCHAR(150),
    password_hash     VARCHAR(255) NOT NULL,
    full_name         VARCHAR(150),
    grade_section     VARCHAR(50),
    adviser_name      VARCHAR(150),
    contact_number    VARCHAR(11),
    status            VARCHAR(10)  NOT NULL DEFAULT 'Active'
                          CHECK (status IN ('Active', 'Expired')),
    terms_version     VARCHAR(30),
    terms_accepted_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,                        -- NULL for students
    last_login_at     TIMESTAMPTZ,
    legacy_lrn        BIGINT UNIQUE                       -- only for accounts converted from v1
);
-- One active account per email. Expired guests free up their email.
CREATE UNIQUE INDEX IF NOT EXISTS users_active_email
    ON users (LOWER(email)) WHERE status = 'Active';

-- ---------- Email verification codes ----------
CREATE TABLE IF NOT EXISTS email_codes (
    code_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       VARCHAR(150) NOT NULL,
    code_hash   VARCHAR(255) NOT NULL,
    ip_address  VARCHAR(64),
    attempts    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS email_codes_email ON email_codes (LOWER(email), created_at DESC);

-- ---------- Failed-login tracking (blocks password guessing) ----------
CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login_key    VARCHAR(160) NOT NULL,
    ip_address   VARCHAR(64),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts (login_key, attempted_at DESC);

-- ---------- Requests to turn a guest account into a student account ----------
-- The ID photo is removed (set to NULL) as soon as staff approve or decline.
CREATE TABLE IF NOT EXISTS activation_requests (
    request_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id),
    full_name       VARCHAR(150) NOT NULL,
    username        VARCHAR(50)  NOT NULL,
    grade_section   VARCHAR(50)  NOT NULL,
    adviser_name    VARCHAR(150) NOT NULL,
    contact_number  VARCHAR(11)  NOT NULL,
    id_photo        BYTEA,
    id_photo_type   VARCHAR(30),
    status          VARCHAR(10) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Approved', 'Declined')),
    decline_reason  TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     INT REFERENCES admin_profile(admin_id)
);
-- Only one pending request per account at a time.
CREATE UNIQUE INDEX IF NOT EXISTS activation_one_pending
    ON activation_requests (user_id) WHERE status = 'Pending';

-- ---------- Incident reports ----------
CREATE TABLE IF NOT EXISTS reports (
    report_no                   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                     INT REFERENCES users(user_id),
    is_anonymous                BOOLEAN NOT NULL DEFAULT FALSE,
    reporter_role               VARCHAR(10),
    category                    VARCHAR(100) NOT NULL,
    report_location             VARCHAR(255) NOT NULL,
    incident_date               DATE,
    report_description          TEXT NOT NULL,
    involved_person_known       BOOLEAN NOT NULL DEFAULT FALSE,
    involved_person_description TEXT,
    report_status               VARCHAR(30) NOT NULL DEFAULT 'Pending',
    reject_reason               TEXT,
    archived_at                 TIMESTAMPTZ,
    report_datetime             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ
);

-- ---------- SOS alerts ----------
CREATE TABLE IF NOT EXISTS sos_alerts (
    sos_no          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT REFERENCES users(user_id),
    sos_location    VARCHAR(255) NOT NULL,
    sos_description TEXT,
    sos_datetime    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sos_status      VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (sos_status IN ('Active', 'Dispatched', 'Responded'))
);

-- ---------- Messages between a student/guest and the guidance office ----------
CREATE TABLE IF NOT EXISTS messages (
    message_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       INT REFERENCES users(user_id),
    admin_id      INT NULL REFERENCES admin_profile(admin_id) ON DELETE SET NULL,
    sender_type   VARCHAR(10) NOT NULL CHECK (sender_type IN ('Student', 'Admin')),
    message_text  TEXT NOT NULL,
    sent_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Every email the system sends (for checking delivery) ----------
CREATE TABLE IF NOT EXISTS email_outbox (
    email_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    to_email   VARCHAR(150) NOT NULL,
    subject    VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at    TIMESTAMPTZ,
    error      TEXT
);

-- ---------- Login sessions (Render's disk is wiped on every deploy) ----------
CREATE TABLE IF NOT EXISTS php_sessions (
    id         VARCHAR(128) PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_php_sessions_expires ON php_sessions (expires_at);

-- =====================================================================
-- Upgrade an OLD (v1) database. Does nothing on a new database.
-- =====================================================================

-- New columns on tables that already existed in v1
ALTER TABLE reports    ADD COLUMN IF NOT EXISTS user_id       INT REFERENCES users(user_id);
ALTER TABLE reports    ADD COLUMN IF NOT EXISTS reporter_role VARCHAR(10);
ALTER TABLE reports    ADD COLUMN IF NOT EXISTS incident_date DATE;
ALTER TABLE reports    ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE reports    ADD COLUMN IF NOT EXISTS archived_at   TIMESTAMPTZ;
ALTER TABLE reports    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS user_id       INT REFERENCES users(user_id);
ALTER TABLE messages   ADD COLUMN IF NOT EXISTS user_id       INT REFERENCES users(user_id);

DO $$
BEGIN
    -- v1 stored students by LRN in a "students" table. Copy APPROVED ones
    -- into "users" as permanent student accounts (passwords stay the same).
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'students') THEN

        INSERT INTO users (account_type, guest_id, username, email, password_hash,
                           full_name, grade_section, adviser_name, contact_number,
                           status, terms_version, terms_accepted_at, created_at, legacy_lrn)
        SELECT 'student',
               'LIA-' || UPPER(SUBSTRING(MD5(s.student_lrn::TEXT) FROM 1 FOR 6)),
               s.student_username, s.email, s.student_password,
               s.student_fullname, s.grade_section, s.adviser_name, s.contact_number,
               'Active', 'v1-import', s.registered_at, s.registered_at, s.student_lrn
        FROM students s
        WHERE s.status = 'Approved'
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.legacy_lrn = s.student_lrn);

        -- Link old reports / SOS / messages to the new accounts
        UPDATE reports r SET user_id = u.user_id
          FROM users u WHERE r.user_id IS NULL AND u.legacy_lrn = r.student_lrn;
        UPDATE sos_alerts a SET user_id = u.user_id
          FROM users u WHERE a.user_id IS NULL AND u.legacy_lrn = a.student_lrn;
        UPDATE messages m SET user_id = u.user_id
          FROM users u WHERE m.user_id IS NULL AND u.legacy_lrn = m.student_lrn;
    END IF;

    -- The old LRN columns are no longer filled in, so they must allow NULL.
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'reports' AND column_name = 'student_lrn') THEN
        ALTER TABLE reports ALTER COLUMN student_lrn DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'sos_alerts' AND column_name = 'student_lrn') THEN
        ALTER TABLE sos_alerts ALTER COLUMN student_lrn DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'messages' AND column_name = 'student_lrn') THEN
        ALTER TABLE messages ALTER COLUMN student_lrn DROP NOT NULL;
    END IF;
END $$;

-- =====================================================================
-- First staff account (run separately, with your own values):
--
--   INSERT INTO admin_profile (admin_username, admin_password, admin_fullname)
--   VALUES ('yourusername', 'TemporaryPass123', 'Your Full Name');
--
-- The password is turned into a secure hash the first time you sign in.
-- =====================================================================
