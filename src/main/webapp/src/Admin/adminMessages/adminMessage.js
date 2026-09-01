function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

function redirectToLoginOnSessionExpiry() {
  localStorage.removeItem("lagroInActionActiveUser");
  window.location.href = "../../../index.html";
}

let currentLrn = null;
let currentStudentName = null;

function formatTime(dbDateTime) {
  if (!dbDateTime) return "";
  const date = new Date(dbDateTime.replace(" ", "T"));
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Loads the sidebar conversation list, auto-selecting a student if we
// arrived via ?lrn=... (e.g. from the "Message Student" button on Manage Reports).
async function renderStudentList() {
  const list = document.getElementById("studentList");
  list.innerHTML = "";

  let conversations = [];
  try {
    const res = await fetch("../../../AdminMessageServlet");
    if (res.status === 401) return redirectToLoginOnSessionExpiry();
    conversations = await res.json();
  } catch (error) {
    list.innerHTML = '<p class="empty-state">Could not load conversations.</p>';
    return;
  }

  if (!conversations.length) {
    list.innerHTML = '<p class="empty-state">No student conversations yet.</p>';
    return;
  }

  conversations.forEach((convo) => {
    const item = document.createElement("div");
    item.className = "student-item";
    item.dataset.lrn = convo.lrn;
    const initials = (convo.fullName || convo.lrn).slice(0, 2).toUpperCase();
    item.innerHTML = `<div class="student-avatar">${initials}</div><div class="student-info"><div class="student-top"><span class="student-name">${convo.fullName}</span><span class="chat-time">${formatTime(convo.lastTime)}</span></div><div class="student-bottom"><span class="last-msg">${convo.lastText || "No messages yet"}</span></div></div>`;
    item.addEventListener("click", () =>
      selectStudent(convo.lrn, convo.fullName, item),
    );
    list.appendChild(item);
  });

  const targetLrn = new URLSearchParams(window.location.search).get("lrn");
  if (targetLrn) {
    const targetItem = list.querySelector(
      `.student-item[data-lrn="${targetLrn}"]`,
    );
    if (targetItem) {
      targetItem.click();
      targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

function selectStudent(lrn, fullName, item) {
  currentLrn = lrn;
  currentStudentName = fullName;
  document
    .querySelectorAll(".student-item")
    .forEach((element) => element.classList.remove("active"));
  item.classList.add("active");
  document.getElementById("activeStudentName").textContent = fullName;
  document.getElementById("activeStudentSub").textContent =
    "Student conversation";
  renderMessages();
}

// Loads one student's full conversation from AdminMessageServlet.
async function renderMessages() {
  const container = document.getElementById("chatMessages");
  container.innerHTML = "";
  if (!currentLrn) return;

  try {
    const res = await fetch(
      `../../../AdminMessageServlet?lrn=${encodeURIComponent(currentLrn)}`,
    );
    if (res.status === 401) return redirectToLoginOnSessionExpiry();
    const messages = await res.json();

    messages.forEach((message) => {
      const messageElement = document.createElement("div");
      messageElement.className = `message msg-${message.sender === "Admin" ? "outgoing" : "incoming"}`;
      messageElement.innerHTML = '<div class="msg-bubble"></div>';
      messageElement.querySelector(".msg-bubble").textContent = message.text;
      const messageTime = document.createElement("span");
      messageTime.className = "message-time";
      messageTime.textContent = formatTime(message.time);
      messageElement.appendChild(messageTime);
      container.appendChild(messageElement);
    });
    container.scrollTop = container.scrollHeight;
  } catch (error) {
    container.innerHTML =
      '<div class="system-message">Could not load messages.</div>';
  }
}

// Sends the admin's reply, then reloads the thread + sidebar preview
async function sendMessage(event) {
  event.preventDefault();
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text || !currentLrn) return;

  input.value = "";

  const params = new URLSearchParams({ lrn: currentLrn, text });

  try {
    const res = await fetch("../../../AdminMessageServlet", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json();

    if (data.success) {
      await renderMessages();
      await renderStudentList(); // refresh sidebar preview text too
    }
  } catch (error) {
    // silently ignore for now
  }
}

function filterStudents() {
  const filter = document.getElementById("studentSearch").value.toLowerCase();
  document.querySelectorAll(".student-item").forEach((item) => {
    item.style.display = item.textContent.toLowerCase().includes(filter)
      ? "flex"
      : "none";
  });
}

function viewCaseDetails() {
  if (!currentLrn) {
    showPagePopup(
      "Select a student conversation first.",
      "No Student Selected",
    );
    return;
  }
  window.location.href = `../adminManageReports/adminManage.html?lrn=${encodeURIComponent(currentLrn)}`;
}

// Opens the "View Info" modal with the student's full profile
async function viewStudentInfo() {
  if (!currentLrn) {
    showPagePopup(
      "Select a student conversation first.",
      "No Student Selected",
    );
    return;
  }

  let info = null;
  try {
    const res = await fetch(
      `../../../AdminMessageServlet?info=${encodeURIComponent(currentLrn)}`,
    );
    if (res.status === 401) return redirectToLoginOnSessionExpiry();
    const data = await res.json();
    if (data.success) info = data;
  } catch (error) {
    // handled below by the info === null check
  }

  if (!info) {
    showPagePopup(
      "Could not load this student's information. Please try again.",
      "Info Unavailable",
    );
    return;
  }

  const initials = (info.fullName || info.lrn || "--")
    .trim()
    .slice(0, 2)
    .toUpperCase();
  document.getElementById("infoAvatarInitials").textContent = initials;
  document.getElementById("infoFullName").textContent =
    info.fullName || currentStudentName || "-";
  document.getElementById("infoUsername").textContent =
    `@${info.username || "-"}`;
  document.getElementById("infoLrn").textContent = info.lrn || currentLrn;
  document.getElementById("infoGradeSection").textContent =
    info.gradeSection || "-";
  document.getElementById("infoAdviser").textContent = info.adviser || "-";
  document.getElementById("infoEmail").textContent = info.email || "-";

  document.getElementById("studentInfoModal").classList.remove("hidden");
}

function closeStudentInfoModal() {
  document.getElementById("studentInfoModal").classList.add("hidden");
}

// closes the Student Info modal on backdrop click, same as the other modals
function closeModalOnOverlay(event) {
  if (event.target.id === "studentInfoModal") {
    closeStudentInfoModal();
  }
}

renderStudentList();

// auto-refresh the open thread + sidebar so new messages show up without a reload
setInterval(() => {
  renderStudentList();
  if (currentLrn) renderMessages();
}, 8000);
