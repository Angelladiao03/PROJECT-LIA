# PROJECT LIA

A student incident-reporting system built with Jakarta EE servlets, MySQL,
and vanilla HTML/CSS/JS. Runs locally via NetBeans + Tomcat + XAMPP.

## Prerequisites

Each teammate needs, installed locally:

- **NetBeans** (with the Java EE / Maven web app support)
- **XAMPP** (for MySQL + phpMyAdmin) — Apache isn't required, only MySQL
- **Apache Tomcat**, registered as a server in NetBeans (Services tab > Servers > Add Server)
- The **MySQL Connector/J** JAR (already pulled in automatically via Maven, see `pom.xml`)

## First-time setup (do this once per machine)

1. **Clone the repo** and open the `PROJECTLIA` folder as a project in NetBeans
   (File > Open Project — NetBeans recognizes it as a Maven web app).

2. **Start XAMPP's MySQL module**, then open phpMyAdmin
   (usually `http://localhost/phpmyadmin`).

3. **Create the database and tables.** Run `schema.sql` (if present) or the
   latest `migration_*.sql` files in this repo, in order, against a new
   database named `lia_db`.

4. **Check `DatabaseConnection.java`**
   (`src/main/java/com/lia/db/DatabaseConnection.java`) matches your local
   MySQL setup. By default it assumes the standard XAMPP setup:
   - URL: `jdbc:mysql://localhost:3306/lia_db`
   - user: `root`
   - password: *(empty)*

   If your MySQL has a different user/password, update those three
   constants locally — **don't commit personal credentials** if yours differ
   from the shared default.

5. **Register Tomcat in NetBeans** if you haven't already (Services tab >
   Servers > right-click > Add Server > Apache Tomcat, point it at your
   Tomcat install folder).

6. **Run the project**: right-click `PROJECTLIA` in the Projects tab > Run.
   NetBeans builds the WAR, deploys it to Tomcat, and opens it in your
   browser at `http://localhost:8080/PROJECTLIA/`.

## Day-to-day workflow

- Always **pull** the latest changes before starting work.
- Create a **branch** for whatever you're working on instead of committing
  straight to `main`, so it's easy to review each other's changes.
- If you change anything in the database schema, add a new
  `migration_YYYY_MM.sql` file (like `migration_2026_08.sql`) rather than
  editing an old one, and mention it in your PR/commit message so teammates
  know to run it.
- Don't commit the `target/` folder or your personal NetBeans private
  settings — the included `.gitignore` already excludes these.

## Project structure

- `src/main/java/com/lia/servlet/` — servlets (one per API endpoint)
- `src/main/java/com/lia/dao/` — database access classes
- `src/main/java/com/lia/db/` — the shared DB connection helper
- `src/main/webapp/` — all frontend HTML/CSS/JS, split into `Admin/` and `Student/`
