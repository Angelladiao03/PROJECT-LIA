package com.lia.servlet;

import com.lia.dao.StudentDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

/**
 * Handles the student sign-up form (Activity 12 wireframe: L.I.G.H.T "STUDENT SIGN UP").
 * Expects a POST with form fields: lrn, fullName, username, password, adviser, gradeSection, email
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

            if (lrnStr == null || fullName == null || username == null || password == null
                    || adviser == null || gradeSection == null || email == null
                    || lrnStr.isBlank() || fullName.isBlank() || username.isBlank()
                    || password.isBlank()) {
                out.print(JsonUtil.error("Please fill out all required fields."));
                return;
            }

            if (rePassword != null && !password.equals(rePassword)) {
                out.print(JsonUtil.error("Password does not match."));
                return;
            }

            long lrn;
            try {
                lrn = Long.parseLong(lrnStr.trim());
            } catch (NumberFormatException e) {
                out.print(JsonUtil.error("LRN must contain digits only."));
                return;
            }

            if (studentDAO.usernameOrEmailExists(username, email)) {
                out.print(JsonUtil.error("Username or email is already registered."));
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
