package com.lia.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

// Opens a connection to the Postgres database. Every DAO calls
// getConnection() to grab one and closes it via try-with-resources.
//
// Locally, everyone on the team just sets their Postgres password to 1234
// (see README) so this works out of the box with zero setup - no
// environment variables needed on your own machine.
//
// On Render, DB_URL / DB_USER / DB_PASSWORD are set as real environment
// variables pointing at Neon, and those override the local defaults below -
// that's the only place this app still relies on environment variables.
public class DatabaseConnection {

    private static final String URL = System.getenv().getOrDefault(
            "DB_URL", "jdbc:postgresql://localhost:5432/lia_db?sslmode=disable");
    private static final String USER = System.getenv().getOrDefault("DB_USER", "postgres");
    private static final String PASSWORD = System.getenv().getOrDefault("DB_PASSWORD", "1234");

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
