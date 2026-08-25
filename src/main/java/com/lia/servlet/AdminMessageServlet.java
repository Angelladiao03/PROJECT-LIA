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

/**
 * Used by the ADMIN messages page.
 * GET  (no params)            -> list of every student conversation (sidebar), latest message each
 * GET  ?lrn=123               -> full conversation with that one student
 * GET  ?action=studentInfo&lrn=123 -> student profile details for the selected chat
 * POST lrn=123&text=...       -> admin sends a message to that student
 */
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
                out.print("[]");
                return;
            }

            String action = request.getParameter("action");
            String lrnParam = request.getParameter("lrn");

            if ("studentInfo".equals(action)) {
                if (lrnParam == null || lrnParam.isBlank()) {
                    out.print(JsonUtil.error("Missing student LRN."));
                    return;
                }

                long lrn = Long.parseLong(lrnParam);
                String[] profile = studentDAO.getProfileForAdmin(lrn);
                if (profile == null) {
                    out.print(JsonUtil.error("Student profile not found."));
                    return;
                }

                out.print("{\"success\": true, "
                    + "\"lrn\": \"" + lrn + "\", "
                    + "\"fullName\": \"" + MessageServlet.esc(profile[0]) + "\", "
                    + "\"username\": \"" + MessageServlet.esc(profile[1]) + "\", "
                    + "\"gradeSection\": \"" + MessageServlet.esc(profile[2]) + "\", "
                    + "\"adviser\": \"" + MessageServlet.esc(profile[3]) + "\", "
                    + "\"email\": \"" + MessageServlet.esc(profile[4]) + "\", "
                    + "\"status\": \"" + MessageServlet.esc(profile[5]) + "\"}");
                return;
            }

            if (lrnParam != null && !lrnParam.isBlank()) {
                // Full conversation with one student
                long lrn = Long.parseLong(lrnParam);
                out.print(MessageServlet.toJsonArray(messageDAO.getConversation(lrn)));
            } else {
                // Sidebar list of all conversations
                List<String[]> rows = messageDAO.getConversationList();
                StringBuilder json = new StringBuilder("[");
                for (int i = 0; i < rows.size(); i++) {
                    String[] r = rows.get(i);
                    if (i > 0) json.append(",");
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
                out.print(JsonUtil.error("You must be logged in as admin to send messages."));
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