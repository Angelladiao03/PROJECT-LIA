-- Full schema for the LIA database (PostgreSQL / Neon).
-- Every statement uses IF NOT EXISTS, so it is safe to run again on an
-- existing database: it only creates what is missing. Run it in Neon's
-- SQL Editor (or with psql).
CREATE TABLE IF NOT EXISTS admin_profile (
    admin_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_username VARCHAR(50)  NOT NULL UNIQUE,
    admin_password VARCHAR(255) NOT NULL,
    admin_fullname VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
    student_lrn      BIGINT PRIMARY KEY,
    student_fullName VARCHAR(150) NOT NULL,
    student_username VARCHAR(50)  NOT NULL UNIQUE,
    student_password VARCHAR(255) NOT NULL,
    adviser_name     VARCHAR(150),
    grade_section    VARCHAR(50),
    email            VARCHAR(150) NOT NULL UNIQUE,
    contact_number   VARCHAR(11) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'Pending'
                          CHECK (status IN ('Pending', 'Approved')),
    registered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    report_no           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_lrn          BIGINT NULL,
    is_anonymous          BOOLEAN NOT NULL DEFAULT FALSE,
    category              VARCHAR(100) NOT NULL,
    report_description    TEXT NOT NULL,
    report_location        VARCHAR(255) NOT NULL,
    involved_person_known         BOOLEAN NOT NULL DEFAULT FALSE,
    involved_person_description   TEXT,
    report_status          VARCHAR(30) NOT NULL DEFAULT 'Pending',
    report_datetime         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_student
        FOREIGN KEY (student_lrn) REFERENCES students(student_lrn)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sos_alerts (
    sos_no          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_lrn     BIGINT NOT NULL,
    sos_location    VARCHAR(255) NOT NULL,
    sos_description TEXT,
    sos_datetime    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sos_status      VARCHAR(20) NOT NULL DEFAULT 'Active'
                          CHECK (sos_status IN ('Active', 'Dispatched', 'Responded')),
    CONSTRAINT fk_sos_student
        FOREIGN KEY (student_lrn) REFERENCES students(student_lrn)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    message_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_lrn    BIGINT NOT NULL,
    admin_id       INT NULL,
    sender_type    VARCHAR(10) NOT NULL
                          CHECK (sender_type IN ('Student', 'Admin')),
    message_text   TEXT NOT NULL,
    sent_datetime  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_student
        FOREIGN KEY (student_lrn) REFERENCES students(student_lrn)
        ON DELETE CASCADE,
    CONSTRAINT fk_messages_admin
        FOREIGN KEY (admin_id) REFERENCES admin_profile(admin_id)
        ON DELETE SET NULL
);

-- Login sessions for the PHP backend (Render's disk is wiped on every
-- deploy, so sessions are kept here instead of in files).
-- Safe to run on an existing database: it only adds this one table.
CREATE TABLE IF NOT EXISTS php_sessions (
    id         VARCHAR(128) PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_php_sessions_expires ON php_sessions (expires_at);

-- Optional: create one admin account to log in with right away.
-- Change the username/password before you actually use this!
-- (A plain-text password here is upgraded to a secure hash automatically
-- the first time that admin logs in.)
-- INSERT INTO admin_profile (admin_username, admin_password, admin_fullname)
-- VALUES ('admin', 'admin123', 'Admin Name');
