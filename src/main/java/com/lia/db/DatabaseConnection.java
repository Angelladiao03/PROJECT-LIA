package com.lia.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Central place that opens a connection to the lia_db MySQL database.
 * Every DAO class calls DatabaseConnection.getConnection() to get a fresh
 * connection, then closes it when done (use try-with-resources).
 */
public class DatabaseConnection {

    // ⚠️ Change these three values to match your own MySQL setup
    private static final String URL =
        "jdbc:mysql://localhost:3306/lia_db?useSSL=false&serverTimezone=Asia/Manila";
    private static final String USER = "root";
    private static final String PASSWORD = "";

    public static Connection getConnection() throws SQLException {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException(
                "MySQL Connector/J driver not found. Right-click your project > "
                + "Properties > Libraries > Add JAR/Folder, and add the "
                + "mysql-connector-j-x.x.x.jar file.", e);
        }
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}
