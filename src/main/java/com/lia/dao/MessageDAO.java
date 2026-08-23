package com.lia.dao;

import com.lia.db.DatabaseConnection;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MessageDAO {

    public boolean sendStudentMessage(long lrn, String text) throws SQLException {
        String sql = "INSERT INTO messages (student_lrn, admin_id, sender_type, message_text) "
            + "VALUES (?, NULL, 'Student', ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            ps.setString(2, text);
            return ps.executeUpdate() == 1;
        }
    }

    public boolean sendAdminMessage(long lrn, int adminId, String text) throws SQLException {
        String sql = "INSERT INTO messages (student_lrn, admin_id, sender_type, message_text) "
            + "VALUES (?, ?, 'Admin', ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            ps.setInt(2, adminId);
            ps.setString(3, text);
            return ps.executeUpdate() == 1;
        }
    }

    /** Full conversation with one student, oldest first (for chat display). */
    public List<String[]> getConversation(long lrn) throws SQLException {
        String sql = "SELECT sender_type, message_text, sent_datetime FROM messages "
            + "WHERE student_lrn = ? ORDER BY sent_datetime ASC";

        List<String[]> results = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    results.add(new String[] {
                        rs.getString("sender_type"),
                        rs.getString("message_text"),
                        rs.getString("sent_datetime")
                    });
                }
            }
        }
        return results;
    }

    /** One row per student with a conversation, showing their latest message (for the admin sidebar list). */
    public List<String[]> getConversationList() throws SQLException {
        String sql = "SELECT m.student_lrn, s.student_fullName, m.message_text, m.sent_datetime "
            + "FROM messages m "
            + "JOIN students s ON s.student_lrn = m.student_lrn "
            + "INNER JOIN ("
            + "  SELECT student_lrn, MAX(sent_datetime) AS max_dt FROM messages GROUP BY student_lrn"
            + ") latest ON latest.student_lrn = m.student_lrn AND latest.max_dt = m.sent_datetime "
            + "GROUP BY m.student_lrn, s.student_fullName, m.message_text, m.sent_datetime "
            + "ORDER BY m.sent_datetime DESC";

        List<String[]> results = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                results.add(new String[] {
                    rs.getString("student_lrn"),
                    rs.getString("student_fullName"),
                    rs.getString("message_text"),
                    rs.getString("sent_datetime")
                });
            }
        }
        return results;
    }
}