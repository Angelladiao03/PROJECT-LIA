package com.lia.servlet;

import com.lia.dao.StudentDAO;
import com.lia.util.Validation;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

// Backs the student "My Account" page.
// GET returns the logged-in student's own profile as JSON.
// POST (username, gradeSection, adviser) updates the editable fields.
@WebServlet("/StudentProfileServlet")
public class StudentProfileServlet extends HttpServlet {

    private final StudentDAO studentDAO = new StudentDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        // Not try-with-resources on purpose - see LoginServlet for why.
        PrintWriter out = response.getWriter();

        try {
            HttpSession session = request.getSession(false);
            Long lrn = session != null ? (Long) session.getAttribute("studentLrn") : null;
            if (lrn == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                out.print(JsonUtil.sessionExpired());
                return;
            }

            String[] profile = studentDAO.getProfile(lrn);
            if (profile == null) {
                out.print(JsonUtil.error("Profile not found."));
                return;
            }

            // profile = [fullName, adviser, gradeSection, email, username, contactNumber]
            out.print("{\"success\": true, "
                    + "\"fullName\": \"" + MessageServlet.esc(profile[0]) + "\", "
                    + "\"adviser\": \"" + MessageServlet.esc(profile[1]) + "\", "
                    + "\"gradeSection\": \"" + MessageServlet.esc(profile[2]) + "\", "
                    + "\"email\": \"" + MessageServlet.esc(profile[3]) + "\", "
                    + "\"username\": \"" + MessageServlet.esc(profile[4]) + "\", "
                    + "\"contactNumber\": \"" + MessageServlet.esc(profile[5]) + "\", "
                    + "\"lrn\": \"" + lrn + "\"}");

        } catch (SQLException e) {
            out.print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        // Not try-with-resources on purpose - see LoginServlet for why.
        PrintWriter out = response.getWriter();

        try {
            HttpSession session = request.getSession(false);
            Long lrn = session != null ? (Long) session.getAttribute("studentLrn") : null;
            if (lrn == null) {
                out.print(JsonUtil.error("You must be logged in."));
                return;
            }

            String username = request.getParameter("username");
            String gradeSection = request.getParameter("gradeSection");
            String adviser = request.getParameter("adviser");

            if (username == null || username.isBlank()) {
                out.print(JsonUtil.error("Please enter a username."));
                return;
            }
            if (gradeSection == null || gradeSection.isBlank()) {
                out.print(JsonUtil.error("Please enter your grade and section."));
                return;
            }
            if (adviser == null || adviser.isBlank()) {
                out.print(JsonUtil.error("Please enter your adviser's name."));
                return;
            }

            String usernameError = Validation.usernameError(username);
            if (usernameError != null) {
                out.print(JsonUtil.error(usernameError));
                return;
            }

            if (studentDAO.usernameTakenByOther(lrn, username)) {
                out.print(JsonUtil.error("That username is already taken. Please choose another."));
                return;
            }

            boolean updated = studentDAO.updateProfile(lrn, username, gradeSection, adviser);
            if (updated) {
                session.setAttribute("username", username);
            }
            out.print(updated ? JsonUtil.success("Profile updated.") : JsonUtil.error("Update failed."));

        } catch (SQLException e) {
            out.print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}
