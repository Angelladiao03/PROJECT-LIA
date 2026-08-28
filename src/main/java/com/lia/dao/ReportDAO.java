package com.lia.dao;

import com.lia.db.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ReportDAO {

    /** Inserts a new incident report. lrn can be null when isAnonymous = true. */
    public int submitReport(Long lrn, boolean isAnonymous, String location,
            String category, String description) throws SQLException {

        String sql = "INSERT INTO reports "
                + "(student_lrn, is_anonymous, report_location, category, report_description) "
                + "VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            if (lrn == null) {
                ps.setNull(1, Types.BIGINT);
            } else {
                ps.setLong(1, lrn);
            }
            ps.setBoolean(2, isAnonymous);
            ps.setString(3, location);
            ps.setString(4, category);
            ps.setString(5, description);

            ps.executeUpdate();

            try (ResultSet keys = ps.getGeneratedKeys()) {
                return keys.next() ? keys.getInt(1) : -1;
            }
        }
    }

    /**
     * Returns every report submitted by one student (used by "My Reports" page).
     */
    public List<String[]> getReportsByStudent(long lrn) throws SQLException {
        String sql = "SELECT report_no, category, report_location, report_status, report_datetime "
                + "FROM reports WHERE student_lrn = ? ORDER BY report_datetime DESC";

        List<String[]> results = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    results.add(new String[] {
                            rs.getString("report_no"),
                            rs.getString("category"),
                            rs.getString("report_location"),
                            rs.getString("report_status"),
                            rs.getString("report_datetime")
                    });
                }
            }
        }
        return results;
    }

    /** Returns every report in the system (used by the admin dashboard). */
    public List<String[]> getAllReports() throws SQLException {
        String sql = "SELECT report_no, student_lrn, is_anonymous, category, "
                + "report_location, report_status, report_datetime FROM reports "
                + "ORDER BY report_datetime DESC";

        List<String[]> results = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
                Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                boolean anon = rs.getBoolean("is_anonymous");
                results.add(new String[] {
                        rs.getString("report_no"),
                        anon ? "Anonymous" : rs.getString("student_lrn"),
                        rs.getString("category"),
                        rs.getString("report_location"),
                        rs.getString("report_status"),
                        rs.getString("report_datetime")
                });
            }
        }
        return results;
    }

    /** Admin updates the status of a report, e.g. to "Resolved". */
    public boolean updateStatus(int reportNo, String newStatus) throws SQLException {
        String sql = "UPDATE reports SET report_status = ? WHERE report_no = ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, newStatus);
            ps.setInt(2, reportNo);
            return ps.executeUpdate() == 1;
        }
    }

    /**
     * Permanently removes a report (used for rejecting new requests, and deleting
     * anonymous resolved cases).
     */
    public boolean deleteReport(int reportNo) throws SQLException {
        String sql = "DELETE FROM reports WHERE report_no = ?";
        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, reportNo);
            return ps.executeUpdate() == 1;
        }
    }

    /**
     * Every report with full student details attached, for the admin dashboard.
     * Columns: reportNo, isAnonymous, lrn, fullName, username, gradeSection,
     * adviser, email, category, description, location, dateTime, status
     */
    public List<String[]> getAllReportsDetailed() throws SQLException {
        String sql = "SELECT r.report_no, r.is_anonymous, r.student_lrn, s.student_fullName, "
                + "s.student_username, s.grade_section, s.adviser_name, s.email, "
                + "r.category, r.report_description, r.report_location, r.report_datetime, r.report_status "
                + "FROM reports r LEFT JOIN students s ON s.student_lrn = r.student_lrn "
                + "ORDER BY r.report_datetime DESC";

        List<String[]> results = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
                Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                boolean anon = rs.getBoolean("is_anonymous");
                results.add(new String[] {
                        rs.getString("report_no"),
                        anon ? "true" : "false",
                        anon ? "" : rs.getString("student_lrn"),
                        anon ? "Anonymous Student" : rs.getString("student_fullName"),
                        anon ? "Anonymous" : rs.getString("student_username"),
                        anon ? "" : rs.getString("grade_section"),
                        anon ? "" : rs.getString("adviser_name"),
                        anon ? "" : rs.getString("email"),
                        rs.getString("category"),
                        rs.getString("report_description"),
                        rs.getString("report_location"),
                        rs.getString("report_datetime"),
                        rs.getString("report_status")
                });
            }
        }
        return results;
    }
}