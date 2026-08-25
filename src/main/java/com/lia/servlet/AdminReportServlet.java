package com.lia.servlet;

import com.lia.dao.ReportDAO;
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
import java.util.List;

/**
 * Used by admin pages that manage reports (New Requests, Active Tracking,
 * Report Records) and view SOS alerts.
 *
 * GET  ?type=sos          -> all SOS alerts as JSON
 * GET  (no params)        -> all reports (every status) as JSON, with student
 *                            info attached. The admin pages filter by status
 *                            in JavaScript, same as before.
 *
 * POST action=approve&reportNo=123     -> Pending -> Active
 * POST action=investigate&reportNo=123 -> Active -> Under Investigation
 * POST action=resolve&reportNo=123     -> -> Resolved (deletes the row instead if anonymous)
 * POST action=reject&reportNo=123      -> deletes the report entirely
 * POST action=dispatch&sosNo=123       -> Active -> Dispatched
 * POST action=respond&sosNo=123        -> -> Responded
 */
@WebServlet("/AdminReportServlet")
public class AdminReportServlet extends HttpServlet {

    private final ReportDAO reportDAO = new ReportDAO();
    private final SosDAO sosDAO = new SosDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try (PrintWriter out = response.getWriter()) {
            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("adminId") == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                out.print(JsonUtil.sessionExpired());
                return;
            }

            if ("sos".equals(request.getParameter("type"))) {
                out.print(sosListToJson(sosDAO.getAllAlerts()));
            } else {
                out.print(reportListToJson(reportDAO.getAllReportsDetailed()));
            }
        } catch (SQLException e) {
            response.getWriter().print("[]");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try (PrintWriter out = response.getWriter()) {
            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("adminId") == null) {
                out.print(JsonUtil.error("You must be logged in as admin."));
                return;
            }

            String action = request.getParameter("action");
            if (action == null) {
                out.print(JsonUtil.error("Missing action."));
                return;
            }

            boolean ok;
            switch (action) {
                case "approve":
                    ok = reportDAO.updateStatus(requireReportNo(request), "Active");
                    break;
                case "investigate":
                    ok = reportDAO.updateStatus(requireReportNo(request), "Under Investigation");
                    break;
                case "resolve": {
                    int reportNo = requireReportNo(request);
                    boolean isAnon = "true".equals(request.getParameter("isAnonymous"));
                    ok = isAnon ? reportDAO.deleteReport(reportNo)
                                : reportDAO.updateStatus(reportNo, "Resolved");
                    break;
                }
                case "reject":
                    ok = reportDAO.deleteReport(requireReportNo(request));
                    break;
                case "dispatch":
                    ok = sosDAO.updateStatus(requireSosNo(request), "Dispatched");
                    break;
                case "respond":
                    ok = sosDAO.updateStatus(requireSosNo(request), "Responded");
                    break;
                default:
                    out.print(JsonUtil.error("Unknown action: " + action));
                    return;
            }

            out.print(ok ? JsonUtil.success("Done.") : JsonUtil.error("Update failed."));

        } catch (SQLException | NumberFormatException e) {
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }

    private int requireReportNo(HttpServletRequest request) {
        return Integer.parseInt(request.getParameter("reportNo"));
    }

    private int requireSosNo(HttpServletRequest request) {
        return Integer.parseInt(request.getParameter("sosNo"));
    }

    private String reportListToJson(List<String[]> rows) {
        StringBuilder json = new StringBuilder("[");
        String[] keys = { "reportNo", "isAnonymous", "lrn", "fullName", "username",
            "gradeSection", "adviser", "email", "category", "description",
            "location", "dateTime", "status" };
        for (int i = 0; i < rows.size(); i++) {
            String[] r = rows.get(i);
            if (i > 0) json.append(",");
            json.append("{");
            for (int j = 0; j < keys.length; j++) {
                if (j > 0) json.append(",");
                json.append("\"").append(keys[j]).append("\":\"").append(MessageServlet.esc(r[j])).append("\"");
            }
            json.append("}");
        }
        return json.append("]").toString();
    }

    private String sosListToJson(List<String[]> rows) {
        StringBuilder json = new StringBuilder("[");
        String[] keys = { "sosNo", "lrn", "fullName", "username", "location", "description", "dateTime", "status" };
        for (int i = 0; i < rows.size(); i++) {
            String[] r = rows.get(i);
            if (i > 0) json.append(",");
            json.append("{");
            for (int j = 0; j < keys.length; j++) {
                if (j > 0) json.append(",");
                json.append("\"").append(keys[j]).append("\":\"").append(MessageServlet.esc(r[j])).append("\"");
            }
            json.append("}");
        }
        return json.append("]").toString();
    }
}