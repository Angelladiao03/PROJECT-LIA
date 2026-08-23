package com.lia.servlet;

import com.lia.dao.AdminDAO;
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
 * Handles the admin/guidance-office login form.
 * Expects a POST with form fields: username, password
 */
@WebServlet("/AdminLoginServlet")
public class AdminLoginServlet extends HttpServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String username = request.getParameter("username");
        String password = request.getParameter("password");

        try (PrintWriter out = response.getWriter()) {

            if (username == null || password == null || username.isBlank() || password.isBlank()) {
                out.print(JsonUtil.error("Please enter a username and password."));
                return;
            }

            int adminId = adminDAO.login(username, password);

            if (adminId == -1) {
                out.print(JsonUtil.error("Invalid Username or Password!"));
                return;
            }

            String fullName = adminDAO.getFullName(adminId);

            HttpSession session = request.getSession(true);
            session.setAttribute("adminId", adminId);
            session.setAttribute("adminFullName", fullName);

            out.print("{\"success\": true, \"message\": \"Login successful.\", "
                + "\"adminId\": " + adminId + ", "
                + "\"fullName\": \"" + (fullName == null ? "" : fullName.replace("\"", "\\\"")) + "\"}");

        } catch (SQLException e) {
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}