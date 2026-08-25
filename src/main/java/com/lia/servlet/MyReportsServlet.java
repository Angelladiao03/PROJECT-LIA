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
import java.util.List;

@WebServlet("/MyReportsServlet")
public class MyReportsServlet extends HttpServlet {

    private final ReportDAO reportDAO = new ReportDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try (PrintWriter out = response.getWriter()) {

            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("studentLrn") == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                out.print(JsonUtil.sessionExpired());
                return;
            }

            long lrn = (Long) session.getAttribute("studentLrn");
            List<String[]> reports = reportDAO.getReportsByStudent(lrn);

            StringBuilder json = new StringBuilder("[");
            for (int i = 0; i < reports.size(); i++) {
                String[] r = reports.get(i);
                if (i > 0) json.append(",");
                json.append("{")
                    .append("\"reportNo\":\"").append(JsonUtil.escapeJson(r[0])).append("\",")
                    .append("\"category\":\"").append(JsonUtil.escapeJson(r[1])).append("\",")
                    .append("\"location\":\"").append(JsonUtil.escapeJson(r[2])).append("\",")
                    .append("\"status\":\"").append(JsonUtil.escapeJson(r[3])).append("\",")
                    .append("\"dateTime\":\"").append(JsonUtil.escapeJson(r[4])).append("\"")
                    .append("}");
            }
            json.append("]");

            out.print(json.toString());

        } catch (SQLException e) {
            response.getWriter().print("[]");
        }
    }
}