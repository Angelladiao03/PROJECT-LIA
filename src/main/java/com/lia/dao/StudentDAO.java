package com.lia.dao;

import com.lia.db.DatabaseConnection;
import java.sql.*;

public class StudentDAO {

    /** Inserts a new student. Returns true if it worked. */
    public boolean registerStudent(long lrn, String fullName, String username,
                                    String password, String adviser, String gradeSection,
                                    String email) throws SQLException {

        String sql = "INSERT INTO students "
            + "(student_lrn, student_fullName, student_username, student_password, "
            + " adviser_name, grade_section, email) VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, lrn);
            ps.setString(2, fullName);
            ps.setString(3, username);
            ps.setString(4, password); // TODO: hash this before saving in a real deployment
            ps.setString(5, adviser);
            ps.setString(6, gradeSection);
            ps.setString(7, email);

            return ps.executeUpdate() == 1;
        }
    }

    /**
     * Checks username + password against the students table.
     * Returns the student's LRN if the login is correct, or -1 if not.
     * Does NOT check approval status -- callers should check getStatus()
     * separately so they can tell "wrong password" apart from "not approved yet".
     */
    public long login(String username, String password) throws SQLException {
        String sql = "SELECT student_lrn FROM students "
            + "WHERE student_username = ? AND student_password = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, username);
            ps.setString(2, password);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("student_lrn");
                }
                return -1;
            }
        }
    }

    /** Returns "Pending" or "Approved" for a student, or null if the LRN doesn't exist. */
    public String getStatus(long lrn) throws SQLException {
        String sql = "SELECT status FROM students WHERE student_lrn = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("status") : null;
            }
        }
    }

    /** Every student still waiting on admin approval, oldest sign-up first. */
    public java.util.List<String[]> getPendingStudents() throws SQLException {
        String sql = "SELECT student_lrn, student_fullName, student_username, "
            + "adviser_name, grade_section, email, registered_at "
            + "FROM students WHERE status = 'Pending' ORDER BY registered_at ASC";

        java.util.List<String[]> results = new java.util.ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                results.add(new String[] {
                    rs.getString("student_lrn"),
                    rs.getString("student_fullName"),
                    rs.getString("student_username"),
                    rs.getString("adviser_name"),
                    rs.getString("grade_section"),
                    rs.getString("email"),
                    rs.getString("registered_at")
                });
            }
        }
        return results;
    }

    /** Admin approves a pending sign-up. */
    public boolean approveStudent(long lrn) throws SQLException {
        String sql = "UPDATE students SET status = 'Approved' WHERE student_lrn = ? AND status = 'Pending'";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            return ps.executeUpdate() == 1;
        }
    }

    /** Admin rejects a pending sign-up; the row is removed so they can re-register. */
    public boolean rejectStudent(long lrn) throws SQLException {
        String sql = "DELETE FROM students WHERE student_lrn = ? AND status = 'Pending'";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            return ps.executeUpdate() == 1;
        }
    }

    /** Fetches basic profile info for a logged-in student (used to fill the session). */
    public String[] getProfile(long lrn) throws SQLException {
        String sql = "SELECT student_fullName, adviser_name, grade_section, email "
            + "FROM students WHERE student_lrn = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new String[] {
                        rs.getString("student_fullName"),
                        rs.getString("adviser_name"),
                        rs.getString("grade_section"),
                        rs.getString("email")
                    };
                }
                return null;
            }
        }
    }

    /** Quick check used by the register form to stop duplicate usernames/emails. */
    public boolean usernameOrEmailExists(String username, String email) throws SQLException {
        String sql = "SELECT student_lrn FROM students WHERE student_username = ? OR email = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, username);
            ps.setString(2, email);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}
