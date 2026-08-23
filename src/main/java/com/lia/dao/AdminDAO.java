package com.lia.dao;

import com.lia.db.DatabaseConnection;
import java.sql.*;

public class AdminDAO {

    /**
     * Checks admin username + password against admin_profile.
     * Returns the admin_id if correct, or -1 if not.
     */
    public int login(String username, String password) throws SQLException {
        String sql = "SELECT admin_id FROM admin_profile "
            + "WHERE admin_username = ? AND admin_password = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, username);
            ps.setString(2, password);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt("admin_id") : -1;
            }
        }
    }

    /** Fetches the admin's display name, used for the session and chat header. */
    public String getFullName(int adminId) throws SQLException {
        String sql = "SELECT admin_fullname FROM admin_profile WHERE admin_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, adminId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("admin_fullname") : null;
            }
        }
    }
}