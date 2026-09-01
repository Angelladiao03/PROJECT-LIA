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

    // name of whoever last replied, or null - drives the "You are connected
    // with [Admin Name]" line on the student's Messages page
    public String getLatestRespondingAdminName(long lrn) throws SQLException {
        String sql = "SELECT a.admin_fullname FROM messages m "
                + "JOIN admin_profile a ON a.admin_id = m.admin_id "
                + "WHERE m.student_lrn = ? AND m.sender_type = 'Admin' "
                + "ORDER BY m.sent_datetime DESC LIMIT 1";

        try (Connection conn = DatabaseConnection.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, lrn);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("admin_fullname") : null;
            }
        }
    }

    // oldest first, so it renders top-to-bottom like a normal chat
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

    // sidebar list: one row per approved student, plus their latest message if any
    public List<String[]> getConversationList() throws SQLException {
        String sql = "SELECT s.student_lrn, s.student_fullName, m.message_text, m.sent_datetime "
                + "FROM students s "
                + "LEFT JOIN ("
                + "  SELECT msg.student_lrn, msg.message_text, msg.sent_datetime FROM messages msg "
                + "  INNER JOIN ("
                + "    SELECT student_lrn, MAX(sent_datetime) AS max_dt FROM messages GROUP BY student_lrn"
                + "  ) latest ON latest.student_lrn = msg.student_lrn AND latest.max_dt = msg.sent_datetime"
                + ") m ON m.student_lrn = s.student_lrn "
                + "WHERE s.status = 'Approved' "
                + "ORDER BY (m.sent_datetime IS NULL) ASC, m.sent_datetime DESC, s.student_fullName ASC";

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