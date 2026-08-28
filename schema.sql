-- Full schema for lia_db, built from the columns every DAO class actually
-- queries. Run this ONCE in phpMyAdmin (SQL tab, no database selected, or
-- after creating an empty `lia_db` database) to set up a brand new copy of
-- the database from scratch.
--
-- If you already have a working lia_db from before the account-approval /
-- SOS-status features were added, do NOT run this file -- run
-- migration_2026_08.sql instead, so you don't lose your existing data.

CREATE DATABASE IF NOT EXISTS lia_db;
USE lia_db;

CREATE TABLE IF NOT EXISTS admin_profile (
    admin_id       INT AUTO_INCREMENT PRIMARY KEY,
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
    status           ENUM('Pending','Approved') NOT NULL DEFAULT 'Pending',
    registered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    report_no           INT AUTO_INCREMENT PRIMARY KEY,
    student_lrn          BIGINT NULL,
    is_anonymous          BOOLEAN NOT NULL DEFAULT FALSE,
    category              VARCHAR(100) NOT NULL,
    report_description    TEXT NOT NULL,
    report_location        VARCHAR(255) NOT NULL,
    report_status          VARCHAR(30) NOT NULL DEFAULT 'Pending',
    report_datetime         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_student
        FOREIGN KEY (student_lrn) REFERENCES students(student_lrn)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sos_alerts (
    sos_no          INT AUTO_INCREMENT PRIMARY KEY,
    student_lrn     BIGINT NOT NULL,
    sos_location    VARCHAR(255) NOT NULL,
    sos_description TEXT,
    sos_datetime    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sos_status      ENUM('Active','Dispatched','Responded') NOT NULL DEFAULT 'Active',
    CONSTRAINT fk_sos_student
        FOREIGN KEY (student_lrn) REFERENCES students(student_lrn)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    message_id     INT AUTO_INCREMENT PRIMARY KEY,
    student_lrn    BIGINT NOT NULL,
    admin_id       INT NULL,
    sender_type    ENUM('Student','Admin') NOT NULL,
    message_text   TEXT NOT NULL,
    sent_datetime  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_student
        FOREIGN KEY (student_lrn) REFERENCES students(student_lrn)
        ON DELETE CASCADE,
    CONSTRAINT fk_messages_admin
        FOREIGN KEY (admin_id) REFERENCES admin_profile(admin_id)
        ON DELETE SET NULL
);

-- Optional: create one admin account to log in with right away.
-- Change the username/password before you actually use this!
-- INSERT INTO admin_profile (admin_username, admin_password, admin_fullname)
-- VALUES ('admin', 'admin123', 'Admin Name');