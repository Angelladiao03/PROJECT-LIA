package com.lia.servlet;

import com.lia.dao.SosDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

@WebServlet("/SosServlet")
public class SosServlet extends HttpServlet {

    private final SosDAO sosDAO = new SosDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String location = request.getParameter("location");
        String description = request.getParameter("description");

        try (PrintWriter out = response.getWriter()) {

            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("studentLrn") == null) {
                out.print(JsonUtil.error("You must be logged in to send an SOS alert."));
                return;
            }

            // Both fields are required -- the description especially, since
            // leaving it optional made it too easy to send a location-only
            // alert with no real information (or as a prank) that still
            // pulls the guidance office's attention. The form now marks this
            // field required too, so this check should rarely trigger in
            // practice; it's here as the server-side backstop.
            if (location == null || description == null || location.isBlank() || description.isBlank()) {
                out.print(JsonUtil.error("Please fill out both your location and a brief description."));
                return;
            }

            long lrn = (Long) session.getAttribute("studentLrn");
            int sosNo = sosDAO.submitSos(lrn, location, description);

            if (sosNo != -1) {
                out.print(JsonUtil.success("The guidance office has been notified immediately.",
                        "sosNo", String.valueOf(sosNo)));
            } else {
                out.print(JsonUtil.error("Could not send SOS alert. Please try again later."));
            }

        } catch (SQLException e) {
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}