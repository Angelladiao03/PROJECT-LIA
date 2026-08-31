package com.lia.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Central place that opens a connection to the LIA PostgreSQL database.
 * Every DAO class calls DatabaseConnection.getConnection() to get a fresh
 * connection, then closes it when done (use try-with-resources).
 *
 * Reads its connection details from environment variables so the exact
 * same build works both locally and once deployed (e.g. on Render, pointed
 * at a Neon database):
 *   DB_URL      e.g. jdbc:postgresql://<host>/<db>?sslmode=require
 *   DB_USER     e.g. neondb_owner
 *   DB_PASSWORD your Neon database password
 *
 * If those aren't set, it falls back to a local PostgreSQL instance on
 * localhost so it still runs out of the box on a developer's machine.
 */
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
