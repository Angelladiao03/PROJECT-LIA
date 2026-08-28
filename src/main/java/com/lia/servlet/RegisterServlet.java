package com.lia.servlet;

import com.lia.dao.StudentDAO;
import com.lia.util.Validation;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

/**
 * Handles the student sign-up form (Activity 12 wireframe: L.I.G.H.T "STUDENT
 * SIGN UP").
 * Expects a POST with form fields: lrn, fullName, username, password, adviser,
 * gradeSection, email
 *
 * NOTE: If your NetBeans project targets an older Servlet API (javax.servlet
 * instead of jakarta.servlet), just change the import lines above from
 * "jakarta.servlet.*" to "javax.servlet.*" — everything else stays the same.
 */
@WebServlet("/RegisterServlet")
public class RegisterServlet extends HttpServlet {

    private final StudentDAO studentDAO = new StudentDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String lrnStr = request.getParameter("lrn");
        String fullName = request.getParameter("fullName");
        String username = request.getParameter("username");
        String password = request.getParameter("password");
        String rePassword = request.getParameter("rePassword");
        String adviser = request.getParameter("adviser");
        String gradeSection = request.getParameter("gradeSection");
        String email = request.getParameter("email");

        try (PrintWriter out = response.getWriter()) {

            // Check each required field individually so the message tells the
            // student exactly what's missing, instead of one generic notice.
            if (lrnStr == null || lrnStr.isBlank()) {
                out.print(JsonUtil.error("Please enter your LRN."));
                return;
            }
            if (fullName == null || fullName.isBlank()) {
                out.print(JsonUtil.error("Please enter your full name."));
                return;
            }
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
            if (email == null || email.isBlank()) {
                out.print(JsonUtil.error("Please enter your email address."));
                return;
            }
            if (password == null || password.isBlank()) {
                out.print(JsonUtil.error("Please enter a password."));
                return;
            }

            if (rePassword != null && !password.equals(rePassword)) {
                out.print(JsonUtil.error("Passwords do not match."));
                return;
            }

            if (!Validation.isValidLrn(lrnStr.trim())) {
                out.print(JsonUtil.error("LRN must be exactly " + Validation.LRN_LENGTH + " digits."));
                return;
            }

            if (!Validation.isValidEmail(email)) {
                out.print(JsonUtil.error("Please enter a valid email address."));
                return;
            }

            String usernameError = Validation.usernameError(username);
            if (usernameError != null) {
                out.print(JsonUtil.error(usernameError));
                return;
            }

            if (!Validation.isStrongPassword(password)) {
                out.print(
                        JsonUtil.error("Password must be at least 8 characters and include both letters and numbers."));
                return;
            }

            long lrn;
            try {
                lrn = Long.parseLong(lrnStr.trim());
            } catch (NumberFormatException e) {
                out.print(JsonUtil.error("LRN must contain digits only."));
                return;
            }

            // Check each uniqueness constraint separately so the student is
            // told exactly which field is the problem, instead of one vague
            // "username or email already registered" message.
            if (studentDAO.lrnExists(lrn)) {
                out.print(JsonUtil.error("This LRN is already registered. Please log in instead."));
                return;
            }
            if (studentDAO.usernameExists(username)) {
                out.print(JsonUtil.error("That username is already taken. Please choose another."));
                return;
            }
            if (studentDAO.emailExists(email)) {
                out.print(JsonUtil.error("That email address is already registered."));
                return;
            }

            boolean created = studentDAO.registerStudent(
                    lrn, fullName, username, password, adviser, gradeSection, email);

            if (created) {
                out.print(JsonUtil.success("Account registered! Please wait for approval."));
            } else {
                out.print(JsonUtil.error("Registration failed. Please try again."));
            }

        } catch (SQLException e) {
            // Most common cause here: duplicate LRN (primary key) already exists
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}
