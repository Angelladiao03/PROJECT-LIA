// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.toggle("collapsed");
  }
}

// Bounces back to login if the session expired server-side (or never existed)
function redirectToLoginOnSessionExpiry() {
  localStorage.removeItem("lagroInActionActiveUser");
  window.location.href = "../../../index.html";
}

// Converts db timestamps like "2026-08-20 09:24:54" into a clock time
function formatTime(dbDateTime) {
  if (!dbDateTime) return "";
  const date = new Date(dbDateTime.replace(" ", "T"));
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appendMessageToChat(sender, text, time) {
  const chatBody = document.getElementById("chatBody");
  const msgContainer = document.createElement("div");
  msgContainer.className = `message ${sender === "Admin" ? "admin-message" : "student-message"}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.textContent = time;

  msgContainer.appendChild(bubble);
  msgContainer.appendChild(timeSpan);
  chatBody.appendChild(msgContainer);
}

// Pulls the real conversation from MessageServlet and shows who's currently
// responding, or a "waiting" status if nobody's replied yet.
async function renderStoredMessages() {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) return;
  chatBody.innerHTML = "";

  try {
    const res = await fetch("../../../MessageServlet");
    if (res.status === 401) return redirectToLoginOnSessionExpiry();
    const data = await res.json();
    const messages = data.messages || [];

    updateConnectionStatus(data.connectedAdmin);

    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "system-message";
      empty.textContent = "No messages yet. Say hello!";
      chatBody.appendChild(empty);
    } else {
      messages.forEach((message) => {
        appendMessageToChat(
          message.sender,
          message.text,
          formatTime(message.time),
        );
      });
    }

    chatBody.scrollTop = chatBody.scrollHeight;
  } catch (error) {
    chatBody.innerHTML =
      '<div class="system-message">Could not load messages.</div>';
  }
}

// Shows "You are connected with [Admin Name]" once an admin has replied,
// or a neutral waiting message before that.
function updateConnectionStatus(connectedAdmin) {
  const statusEl = document.getElementById("adminConnectionStatus");
  if (!statusEl) return;
  statusEl.textContent = connectedAdmin
    ? `You are connected with ${connectedAdmin}`
    : "Waiting for a guidance admin to respond";
}

// Sends the typed message, then reloads the thread to stay in sync with the db.
async function handleSendMessage(event) {
  event.preventDefault();

  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";

  const params = new URLSearchParams({ text });

  try {
    const res = await fetch("../../../MessageServlet", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json();

    if (data.success) {
      // reload so the thread matches what's actually stored
      await renderStoredMessages();
    } else {
      appendMessageToChat("System", data.message, "");
    }
  } catch (error) {
    appendMessageToChat("System", "Could not reach the server.", "");
  }
}

// Auto scroll on load
window.addEventListener("DOMContentLoaded", () => {
  renderStoredMessages();
  // poll for new replies so the student doesn't have to refresh manually
  setInterval(renderStoredMessages, 8000);
});
