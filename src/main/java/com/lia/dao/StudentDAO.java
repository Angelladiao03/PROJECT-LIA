package com.lia.dao;

import com.lia.db.DatabaseConnection;
import java.sql.*;

public class StudentDAO {

    // adds a new student row from the sign-up form
    public boolean registerStudent(long lrn, String fullName, String username,
            String password, String adviser, String gradeSection,
            String email, String contactNumber) throws SQLException {

        String sql = "INSERT INTO students "
                + "(student_lrn, student_fullName, student_username, student_password, "
                + " adviser_name, grade_section, email, contact_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, lrn);
            ps.setString(2, fullName);
            ps.setString(3, username);
            ps.setString(4, password); // TODO: hash this before saving in a real deployment
            ps.setString(5, adviser);
            ps.setString(6, gradeSection);
            ps.setString(7, email);
            ps.setString(8, contactNumber);

            return ps.executeUpdate() == 1;
        }
    }

    // Returns the LRN on a correct username-or-LRN + password, -1 otherwise.
    // "identifier" can be either the student's username or their LRN - the
    // login form accepts both in the same field, so we match against
    // whichever one it looks like.
    // Doesn't look at approval status - LoginServlet checks getStatus()
    // right after, so a wrong password and "not approved yet" don't get
    // mixed into the same error message.
    public long login(String identifier, String password) throws SQLException {
        String sql = "SELECT student_lrn FROM students "
                + "WHERE (student_username = ? OR CAST(student_lrn AS TEXT) = ?) "
                + "AND student_password = ?";

        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, identifier);
            ps.setString(2, identifier);
            ps.setString(3, password);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("student_lrn");
                }
                return -1;
            }
        }
    }

    // "Pending" or "Approved", or null if the LRN doesn't exist
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

    // oldest sign-up first, so admin works through the backlog in order
    public java.util.List<String[]> getPendingStudents() throws SQLException {
        String sql = "SELECT student_lrn, student_fullName, student_username, "
                + "adviser_name, grade_section, email, contact_number, registered_at "
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
                        rs.getString("contact_number"),
                        rs.getString("registered_at")
                });
            }
        }
        return results;
    }

    public boolean approveStudent(long lrn) throws SQLException {
        String sql = "UPDATE students SET status = 'Approved' WHERE student_lrn = ? AND status = 'Pending'";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            return ps.executeUpdate() == 1;
        }
    }

    // deletes rather than flags rejected, so the LRN is free to sign up again
    public boolean rejectStudent(long lrn) throws SQLException {
        String sql = "DELETE FROM students WHERE student_lrn = ? AND status = 'Pending'";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            return ps.executeUpdate() == 1;
        }
    }

    // basic profile fields, used for My Account and for filling the session
    public String[] getProfile(long lrn) throws SQLException {
        String sql = "SELECT student_fullName, adviser_name, grade_section, email, student_username, contact_number "
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
                            rs.getString("email"),
                            rs.getString("student_username"),
                            rs.getString("contact_number")
                    };
                }
                return null;
            }
        }
    }

    // Updates username / grade & section / adviser.
    // Return value isn't tied to the affected-row count on purpose - if the
    // form is saved again with nothing actually different, the DB reports 0
    // rows changed even though nothing failed. lrn is already verified to
    // belong to the caller, so getting here without an exception is a win.
    public boolean updateProfile(long lrn, String username, String gradeSection, String adviser) throws SQLException {
        String sql = "UPDATE students SET student_username = ?, grade_section = ?, adviser_name = ? "
                + "WHERE student_lrn = ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ps.setString(2, gradeSection);
            ps.setString(3, adviser);
            ps.setLong(4, lrn);
            ps.executeUpdate();
            return true;
        }
    }

    // same as usernameExists() but skips the student's own row, for profile edits
    public boolean usernameTakenByOther(long lrn, String username) throws SQLException {
        String sql = "SELECT student_lrn FROM students WHERE student_username = ? AND student_lrn != ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ps.setLong(2, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean usernameExists(String username) throws SQLException {
        String sql = "SELECT student_lrn FROM students WHERE student_username = ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean emailExists(String email) throws SQLException {
        String sql = "SELECT student_lrn FROM students WHERE email = ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    // primary key clash check for sign-up
    public boolean lrnExists(long lrn) throws SQLException {
        String sql = "SELECT student_lrn FROM students WHERE student_lrn = ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}
