# LagroInAction (PROJECT LIA)

LagroInAction is a student guidance and incident-reporting web app built for
Lagro High School. It gives students a safe, simple way to report bullying
or other incidents (named or anonymous), send an emergency SOS alert to the
guidance office, and message a guidance admin directly. Admins get a
dashboard to review and act on incoming reports, respond to SOS alerts,
approve new student accounts, and chat back with students — all backed by a
real database instead of spreadsheets or paper forms.

It's built with Jakarta EE servlets on the backend, PostgreSQL for storage,
and plain HTML/CSS/JS on the frontend (no frontend framework, no build
step).

**Main features:**

- Student sign-up with admin approval before a new account can log in
- Incident reporting, either under the student's name or fully anonymous
- One-tap SOS alerts that go straight to the guidance office
- Two-way messaging between a student and the guidance office
- An admin dashboard with report/SOS stats, charts, and a full report
  history

## Tech stack

- **Backend:** Java 17, Jakarta EE (Servlets), built with Maven
- **Database:** PostgreSQL
- **Frontend:** HTML, CSS, and vanilla JavaScript (no framework)
- **Server:** Apache Tomcat

## Prerequisites

Install these once per machine:

- **JDK 17** (or newer) — [adoptium.net](https://adoptium.net/)
- **Maven** — usually bundled with your IDE; only needed standalone if
  you're not using NetBeans
- **NetBeans** (with Java EE / Maven web app support) — or any IDE you're
  comfortable with, this guide just uses NetBeans as the example
- **Apache Tomcat 10 or newer**, registered as a server in NetBeans
  (Services tab → Servers → Add Server)
- **PostgreSQL** — see the setup steps below

## Connecting to a local database (step-by-step)

This is the part that trips people up the most, so here it is in full,
assuming you've never set up a local Postgres database before.

### 1. Install PostgreSQL

Download and run the installer for your OS from
[postgresql.org/download](https://www.postgresql.org/download/). During
setup:

- Keep the default **port `5432`**.
- When it asks for a **password for the `postgres` superuser**, pick
  something simple you'll remember (e.g. `postgres`) — this is only for
  your own machine, not a shared secret.
- The installer also installs **pgAdmin**, a graphical tool for managing
  the database. You'll use it in the next step.

### 2. Create the `lia_db` database

You can do this with pgAdmin (easiest for beginners) or the `psql` command
line — pick whichever you're comfortable with.

**Using pgAdmin:**

1. Open pgAdmin and connect to your local server (it'll ask for the
   password you set during install).
2. Right-click **Databases** → **Create** → **Database...**
3. Name it `lia_db` and click **Save**.

**Using the command line (`psql`):**

```bash
psql -U postgres -c "CREATE DATABASE lia_db;"
```

### 3. Run `schema.sql` against your new database

This creates every table the app needs (students, reports, SOS alerts,
messages, admin accounts).

**Using pgAdmin:**

1. Click on `lia_db` in the left sidebar to select it.
2. Open the **Query Tool** (Tools → Query Tool, or the toolbar icon).
3. Open `schema.sql` from this project (File → Open, or just copy-paste
   its contents into the query editor).
4. Click **Execute/Run** (the ▶ button, or F5).

**Using the command line:**

```bash
psql -U postgres -d lia_db -f schema.sql
```

Either way, you should now see tables like `students`, `reports`,
`sos_alerts`, `messages`, and `admin_profile` under `lia_db`.

### 4. Point the app at your local database

The app reads its database settings from three environment variables:

| Variable      | Default if not set                                      |
|----------------|-----------------------------------------------------------|
| `DB_URL`      | `jdbc:postgresql://localhost:5432/lia_db?sslmode=disable` |
| `DB_USER`     | `postgres`                                                 |
| `DB_PASSWORD` | *(empty)*                                                  |

If you used the defaults above (`lia_db` on port `5432`, user `postgres`),
**you don't need to set anything** — it'll just work out of the box.

If your setup is different (a different password, a different database
name, etc.), you'll need to set these as actual **OS environment
variables** — NetBeans doesn't have a VM Options field for Maven web
projects, so they can't be set from inside the IDE's project settings.

**Windows:**

1. Search the Start menu for **"Environment Variables"** and open **Edit
   environment variables for your account**.
2. Under **User variables**, click **New** and add `DB_PASSWORD` (and
   `DB_URL` / `DB_USER` if needed) with your value. For example, if your
   `postgres` password is `mypassword`, add a variable named
   `DB_PASSWORD` with the value `mypassword`.
3. **Restart NetBeans completely** — it only picks up environment
   variables that existed when it was launched, and its managed Tomcat
   runs as a child process of the IDE.

**macOS/Linux:** set the variables in your shell profile (e.g.
`~/.zshrc` or `~/.bashrc`), then restart NetBeans from a terminal session
that has them loaded — or set them before launching Tomcat directly if
you're not using NetBeans's managed server.

You don't need to (and shouldn't) hardcode your personal password into
`DatabaseConnection.java` — that file is shared with the rest of the team.

### 5. Create an admin account

`schema.sql` doesn't insert a default admin for you, so add one yourself
after running it (via pgAdmin's Query Tool or `psql`):

```sql
INSERT INTO admin_profile (admin_username, admin_password, admin_fullname)
VALUES ('admin', 'admin123', 'Guidance Admin');
```

You can now log in on the Admin Log In tab with that username/password.
(Passwords aren't hashed yet in this version — see the `TODO` in
`StudentDAO.java` — so don't reuse a real password here.)

## Running the project

1. **Clone the repo** and open the `PROJECTLIA` folder as a project in
   NetBeans (File → Open Project — NetBeans recognizes it as a Maven web
   app).
2. Make sure PostgreSQL is running and `lia_db` is set up (see above).
3. **Register Tomcat in NetBeans** if you haven't already (Services tab →
   Servers → right-click → Add Server → Apache Tomcat, point it at your
   Tomcat install folder).
4. **Run the project**: right-click `PROJECTLIA` in the Projects tab → Run.
   NetBeans builds the WAR, deploys it to Tomcat, and opens it in your
   browser at `http://localhost:8080/PROJECTLIA/`.

## Day-to-day workflow

- Always **pull** the latest changes before starting work.
- Create a **branch** for whatever you're working on instead of committing
  straight to `main`, so it's easy to review each other's changes.
- Don't commit the `target/` folder or your personal NetBeans private
  settings — the included `.gitignore` already excludes these.

## Project structure

- `src/main/java/com/lia/servlet/` — servlets (one per API endpoint)
- `src/main/java/com/lia/dao/` — database access classes
- `src/main/java/com/lia/db/` — the shared DB connection helper
- `src/main/webapp/` — all frontend HTML/CSS/JS, split into `Admin/` and
  `Student/`
- `schema.sql` — creates the database from scratch