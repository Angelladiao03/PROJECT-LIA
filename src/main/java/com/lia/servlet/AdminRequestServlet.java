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
import java.util.List;

// Backs the admin "Request Account" page - approving or rejecting student
// sign-ups before they can log in.
//
// GET                            every student still waiting on approval
// POST action=approve&lrn=..     Pending -> Approved
// POST action=reject&lrn=..      deletes the pending sign-up
@WebServlet("/AdminRequestServlet")
public class AdminRequestServlet extends HttpServlet {

    private final StudentDAO studentDAO = new StudentDAO();

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
            out.print(pendingListToJson(studentDAO.getPendingStudents()));
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
            String lrnStr = request.getParameter("lrn");
            if (action == null || lrnStr == null) {
                out.print(JsonUtil.error("Missing action or lrn."));
                return;
            }
            long lrn = Long.parseLong(lrnStr);

            boolean ok;
            switch (action) {
                case "approve":
                    ok = studentDAO.approveStudent(lrn);
                    break;
                case "reject":
                    ok = studentDAO.rejectStudent(lrn);
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

    private String pendingListToJson(List<String[]> rows) {
        StringBuilder json = new StringBuilder("[");
        String[] keys = { "lrn", "fullName", "username", "adviser", "gradeSection", "email", "registeredAt" };
        for (int i = 0; i < rows.size(); i++) {
            String[] r = rows.get(i);
            if (i > 0)
                json.append(",");
            json.append("{");
            for (int j = 0; j < keys.length; j++) {
                if (j > 0)
                    json.append(",");
                json.append("\"").append(keys[j]).append("\":\"").append(MessageServlet.esc(r[j])).append("\"");
            }
            json.append("}");
        }
        return json.append("]").toString();
    }
}
