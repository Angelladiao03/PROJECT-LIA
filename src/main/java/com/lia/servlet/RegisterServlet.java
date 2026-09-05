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

// Student sign-up form. POST fields: lrn, fullName, username, password,
// rePassword, adviser, gradeSection, email, contactNumber. New accounts sit
// as "Pending" until an admin approves them from the Request Account page.
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
        String contactNumber = request.getParameter("contactNumber");

        // Not try-with-resources on purpose: closing `out` early (which
        // try-with-resources does the instant an exception is thrown, before
        // any catch block runs) meant the "Database error: ..." message in
        // the catch below was being written to an already-closed writer and
        // silently discarded - the browser just saw an empty response.
        PrintWriter out = response.getWriter();

        try {

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
            if (contactNumber == null || contactNumber.isBlank()) {
                out.print(JsonUtil.error("Please enter your contact number."));
                return;
            }
            if (password == null || password.isBlank()) {
                out.print(JsonUtil.error("Please enter a password."));
                return;
            }

            if (rePassword != null && !password.equals(rePassword)) {
                out.print(JsonUtil.error("Password does not match!"));
                return;
            }

            String lrnError = Validation.lrnError(lrnStr.trim());
            if (lrnError != null) {
                out.print(JsonUtil.error(lrnError));
                return;
            }

            if (!Validation.isValidEmail(email)) {
                out.print(JsonUtil.error("Please enter a valid email address!"));
                return;
            }

            String contactNumberError = Validation.contactNumberError(contactNumber);
            if (contactNumberError != null) {
                out.print(JsonUtil.error(contactNumberError));
                return;
            }

            String usernameError = Validation.usernameError(username);
            if (usernameError != null) {
                out.print(JsonUtil.error(usernameError));
                return;
            }

            String passwordError = Validation.passwordError(password);
            if (passwordError != null) {
                out.print(JsonUtil.error(passwordError));
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
                    lrn, fullName, username, password, adviser, gradeSection, email, contactNumber.trim());

            if (created) {
                out.print(JsonUtil.success("Account registered! Please wait for approval."));
            } else {
                out.print(JsonUtil.error("Registration failed. Please try again."));
            }

        } catch (SQLException e) {
            // Most common cause here: duplicate LRN (primary key) already exists
            out.print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}
