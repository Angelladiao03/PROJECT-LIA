package com.lia.servlet;

import com.lia.dao.ReportDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

// Submit Incident Report form. POST fields: isAnonymous ("true"/"false"),
// location, category, description, involvedPersonKnown ("true"/"false"),
// involvedPersonDescription (required when involvedPersonKnown is "true").
// Non-anonymous reports require a logged-in student session.
@WebServlet("/ReportServlet")
public class ReportServlet extends HttpServlet {

    private final ReportDAO reportDAO = new ReportDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        boolean isAnonymous = "true".equalsIgnoreCase(request.getParameter("isAnonymous"));
        String location = request.getParameter("location");
        String category = request.getParameter("category");
        String description = request.getParameter("description");
        boolean involvedPersonKnown = "true".equalsIgnoreCase(request.getParameter("involvedPersonKnown"));
        String involvedPersonDescription = request.getParameter("involvedPersonDescription");

        // Not try-with-resources on purpose - see LoginServlet for why.
        PrintWriter out = response.getWriter();

        try {

            if (location == null || category == null || description == null
                    || location.isBlank() || category.isBlank() || description.isBlank()) {
                out.print(JsonUtil.error("Please fill out location, category, and description."));
                return;
            }

            if (involvedPersonKnown
                    && (involvedPersonDescription == null || involvedPersonDescription.isBlank())) {
                out.print(JsonUtil.error("Please describe the person(s) involved."));
                return;
            }

            Long lrn = null;
            HttpSession session = request.getSession(false);

            if (!isAnonymous) {
                if (session == null || session.getAttribute("studentLrn") == null) {
                    out.print(JsonUtil.error("You must be logged in to submit a non-anonymous report."));
                    return;
                }
                lrn = (Long) session.getAttribute("studentLrn");
            } else if (session != null && session.getAttribute("studentLrn") != null) {
                // still logged: is_anonymous just controls how it's displayed later
                lrn = (Long) session.getAttribute("studentLrn");
            }

            int reportNo = reportDAO.submitReport(lrn, isAnonymous, location, category, description,
                    involvedPersonKnown, involvedPersonDescription);

            if (reportNo != -1) {
                out.print(JsonUtil.success("Report submitted. Please wait for status updates.",
                        "reportNo", String.valueOf(reportNo)));
            } else {
                out.print(JsonUtil.error("Could not submit report. Please try again."));
            }

        } catch (SQLException e) {
            out.print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}
