package com.lia.servlet;

import com.lia.dao.MessageDAO;
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
 * Used by the STUDENT messages page.
 * GET -> { "connectedAdmin": "<name>" | null, "messages": [...] } for the
 * logged-in student's conversation. connectedAdmin is the name of
 * whichever admin most recently replied, or null if none has yet.
 * POST -> sends a new message from the student (form field: text)
 */
@WebServlet("/MessageServlet")
public class MessageServlet extends HttpServlet {

    private final MessageDAO messageDAO = new MessageDAO();

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
            String connectedAdmin = messageDAO.getLatestRespondingAdminName(lrn);

            out.print("{\"connectedAdmin\": "
                    + (connectedAdmin == null ? "null" : "\"" + esc(connectedAdmin) + "\"") + ", "
                    + "\"messages\": " + toJsonArray(messageDAO.getConversation(lrn)) + "}");
        } catch (SQLException e) {
            response.getWriter().print("{\"connectedAdmin\": null, \"messages\": []}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String text = request.getParameter("text");

        try (PrintWriter out = response.getWriter()) {
            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("studentLrn") == null) {
                out.print(JsonUtil.error("You must be logged in to send messages."));
                return;
            }
            if (text == null || text.isBlank()) {
                out.print(JsonUtil.error("Message cannot be empty."));
                return;
            }
            long lrn = (Long) session.getAttribute("studentLrn");
            boolean sent = messageDAO.sendStudentMessage(lrn, text);
            out.print(sent ? JsonUtil.success("Sent.") : JsonUtil.error("Could not send message."));
        } catch (SQLException e) {
            response.getWriter().print(JsonUtil.error("Database error: " + e.getMessage()));
        }
    }

    static String toJsonArray(List<String[]> rows) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < rows.size(); i++) {
            String[] r = rows.get(i);
            if (i > 0)
                json.append(",");
            json.append("{\"sender\":\"").append(esc(r[0])).append("\",")
                    .append("\"text\":\"").append(esc(r[1])).append("\",")
                    .append("\"time\":\"").append(esc(r[2])).append("\"}");
        }
        return json.append("]").toString();
    }

    // Kept as a short alias so the other servlets in this package (which were
    // already calling MessageServlet.esc(...) all over the place) don't need
    // to change -- it just forwards to the shared escaper in JsonUtil now,
    // instead of duplicating the same replace() calls in every file.
    static String esc(String s) {
        return JsonUtil.escapeJson(s);
    }
}