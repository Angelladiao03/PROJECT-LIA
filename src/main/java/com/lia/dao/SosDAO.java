package com.lia.dao;

import com.lia.db.DatabaseConnection;
import java.sql.*;

public class SosDAO {

    /** Inserts a new SOS alert for a logged-in student. */
    public int submitSos(long lrn, String location, String description) throws SQLException {

        String sql = "INSERT INTO sos_alerts (student_lrn, sos_location, sos_description) "
            + "VALUES (?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setLong(1, lrn);
            ps.setString(2, location);
            ps.setString(3, description);

            ps.executeUpdate();

            try (ResultSet keys = ps.getGeneratedKeys()) {
                return keys.next() ? keys.getInt(1) : -1;
            }
        }
    }

    /** Every SOS alert with the student's name attached, newest first, for the admin dashboard. */
    public java.util.List<String[]> getAllAlerts() throws SQLException {
        String sql = "SELECT a.sos_no, a.student_lrn, s.student_fullName, s.student_username, "
            + "a.sos_location, a.sos_description, a.sos_datetime, a.sos_status "
            + "FROM sos_alerts a JOIN students s ON s.student_lrn = a.student_lrn "
            + "ORDER BY a.sos_datetime DESC";

        java.util.List<String[]> results = new java.util.ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                results.add(new String[] {
                    rs.getString("sos_no"),
                    rs.getString("student_lrn"),
                    rs.getString("student_fullName"),
                    rs.getString("student_username"),
                    rs.getString("sos_location"),
                    rs.getString("sos_description"),
                    rs.getString("sos_datetime"),
                    rs.getString("sos_status")
                });
            }
        }
        return results;
    }

    /** Admin marks an SOS alert as Dispatched or Responded. */
    public boolean updateStatus(int sosNo, String newStatus) throws SQLException {
        String sql = "UPDATE sos_alerts SET sos_status = ? WHERE sos_no = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newStatus);
            ps.setInt(2, sosNo);
            return ps.executeUpdate() == 1;
        }
    }
}