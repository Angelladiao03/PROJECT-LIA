package com.lia.servlet;

import com.lia.dao.MessageDAO;
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

// Backs the admin Messages page.
// GET (no params)  every student conversation for the sidebar, latest msg each
// GET ?lrn=123     full conversation with that student
// GET ?info=123    that student's profile, for the "View Info" panel
// POST lrn=123&text=...  admin sends a message to that student
@WebServlet("/AdminMessageServlet")
public class AdminMessageServlet extends HttpServlet {

    private final MessageDAO messageDAO = new MessageDAO();
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

            String lrnParam = request.getParameter("lrn");
            String infoParam = request.getParameter("info");

            if (infoParam != null && !infoParam.isBlank()) {
                // Student details for the "View Info" panel on the chat header.
                out.print(studentInfoToJson(Long.parseLong(infoParam)));
            } else if (lrnParam != null && !lrnParam.isBlank()) {
                // Full conversation with one student
                long lrn = Long.parseLong(lrnParam);
                out.print(MessageServlet.toJsonArray(messageDAO.getConversation(lrn)));
            } else {
                // Sidebar list of all conversations
                List<String[]> rows = messageDAO.getConversationList();
                StringBuilder json = new StringBuilder("[");
                for (int i = 0; i < rows.size(); i++) {
                    String[] r = rows.get(i);
                    if (i > 0)
                        json.append(",");
                    json.append("{\"lrn\":\"").append(MessageServlet.esc(r[0])).append("\",")
                            .append("\"fullName\":\"").append(MessageServlet.esc(r[1])).append("\",")
                            .append("\"lastText\":\"").append(MessageServlet.esc(r[2])).append("\",")
                            .append("\"lastTime\":\"").append(MessageServlet.esc(r[3])).append("\"}");
                }
                json.append("]");
                out.print(json.toString());
            }
        } catch (SQLException | NumberFormatException e) {
            response.getWriter().print("[]");
        }
    }

    // same fields as the student's own My Account page
    private String studentInfoToJson(long lrn) throws SQLException {
        String[] profile = studentDAO.getProfile(lrn);
        if (profile == null) {
            return JsonUtil.error("Student not found.");
        }
        // profile = [fullName, adviser, gradeSection, email, username, contactNumber]
        return "{\"success\": true, "
                + "\"lrn\": \"" + lrn + "\", "
                + "\"fullName\": \"" + JsonUtil.escapeJson(profile[0]) + "\", "
                + "\"adviser\": \"" + JsonUtil.escapeJson(profile[1]) + "\", "
                + "\"gradeSection\": \"" + JsonUtil.escapeJson(profile[2]) + "\", "
                + "\"email\": \"" + JsonUtil.escapeJson(profile[3]) + "\", "
                + "\"username\": \"" + JsonUtil.escapeJson(profile[4]) + "\", "
                + "\"contactNumber\": \"" + JsonUtil.escapeJson(profile[5]) + "\"}";
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String lrnParam = request.getParameter("lrn");
        String text = request.getParameter("text");

        try (PrintWriter out = response.getWriter()) {
            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("adminId") == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                out.print(JsonUtil.sessionExpired());
                return;
            }
            if (lrnParam == null || text == null || text.isBlank()) {
                out.print(JsonUtil.error("Missing student or message text."));
                return;
            }

            long lrn = Long.parseLong(lrnParam);
            int adminId = (Integer) session.getAttribute("adminId");

            boolean sent = messageDAO.sendAdminMessage(lrn, adminId, text);
            out.print(sent ? JsonUtil.success("Sent.") : JsonUtil.error("Could not send message."));

        } catch (SQLException | NumberFormatException e) {
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }
}