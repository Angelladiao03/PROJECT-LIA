package com.lia.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

// Opens a connection to the Postgres database. Every DAO calls
// getConnection() to grab one and closes it via try-with-resources.
//
// Reads DB_URL / DB_USER / DB_PASSWORD from the environment so the same
// build works locally and on Render pointed at Neon. Falls back to a local
// Postgres instance if those aren't set, so it still runs out of the box.
public class DatabaseConnection {

    private static final String URL = System.getenv().getOrDefault(
            "DB_URL", "jdbc:postgresql://localhost:5432/lia_db?sslmode=disable");
    private static final String USER = System.getenv().getOrDefault("DB_USER", "postgres");
    private static final String PASSWORD = System.getenv().getOrDefault("DB_PASSWORD", "");

    public static Connection getConnection() throws SQLException {
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException(
                    "PostgreSQL JDBC driver not found. Make sure the org.postgresql:postgresql "
                            + "dependency in pom.xml built into the WAR's WEB-INF/lib folder.",
                    e);
        }
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}
