package com.lia.servlet;

import com.lia.dao.StudentDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

/**
 * Handles the student login form.
 * Expects a POST with form fields: username, password
 * On success it stores the student's LRN in the HttpSession so every other
 * servlet (ReportServlet, SosServlet, MessageServlet...) can find out who is logged in.
 */
@WebServlet("/LoginServlet")
public class LoginServlet extends HttpServlet {

    private final StudentDAO studentDAO = new StudentDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String username = request.getParameter("username");
        String password = request.getParameter("password");

        try (PrintWriter out = response.getWriter()) {

            if (username == null || username.isBlank()) {
                out.print(JsonUtil.error("Please enter your username."));
                return;
            }
            if (password == null || password.isBlank()) {
                out.print(JsonUtil.error("Please enter your password."));
                return;
            }

            long lrn = studentDAO.login(username, password);

            if (lrn == -1) {
                out.print(JsonUtil.error("Invalid Username or Password!"));
                return;
            }

            if (!"Approved".equals(studentDAO.getStatus(lrn))) {
                out.print(JsonUtil.error("Your account is still waiting for admin approval."));
                return;
            }

            HttpSession session = request.getSession(true);
            session.setAttribute("studentLrn", lrn);
            session.setAttribute("username", username);

            String[] profile = studentDAO.getProfile(lrn);
            String fullName = profile != null ? profile[0] : "";

            out.print("{\"success\": true, \"message\": \"Login successful.\", "
                + "\"lrn\": \"" + lrn + "\", "
                + "\"fullName\": \"" + MessageServlet.esc(fullName) + "\"}");

        } catch (SQLException e) {
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}
