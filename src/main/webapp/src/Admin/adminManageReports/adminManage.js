// In-memory cache of the last fetched reports/alerts, so modals and message
// links can look up details without a second request.
let cachedReports = [];
let cachedAlerts = [];

// Toggle Sidebar Collapsed State
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
}

// Bounces the admin back to login if the server-side session has expired
// (or was never created), instead of leaving these tables stuck empty.
function redirectToLoginOnSessionExpiry() {
  localStorage.removeItem("lagroInActionActiveUser");
  window.location.href = "../../../index.html";
}

// Toggle Action Dropdown Menu
function toggleDropdown(btn) {
  document.querySelectorAll(".dropdown-menu").forEach((menu) => {
    if (menu !== btn.nextElementSibling) {
      menu.classList.remove("show");
    }
  });
  const dropdownMenu = btn.nextElementSibling;
  dropdownMenu.classList.toggle("show");
}

// Close dropdowns if user clicks anywhere outside
window.onclick = function (event) {
  if (!event.target.matches(".btn-more")) {
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("show");
    });
  }
};

async function postReportAction(params) {
  try {
    const res = await fetch("../../../AdminReportServlet", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    return false;
  }
}

// Approve submitted report (New Requests -> Active Tracking)
async function approveReport(btn) {
  const row = btn.closest("tr");
  const reportNo = row.dataset.reportId;
  const ok = await postReportAction({ action: "approve", reportNo });
  if (!ok) {
    showPagePopup(
      "Could not approve this report. Please try again.",
      "Approval Failed",
    );
    return;
  }
  row.style.transition = "all 0.3s ease";
  row.style.opacity = "0";
  setTimeout(() => {
    row.remove();
    loadSavedReportsAndAlerts();
    showPagePopup(
      "Report approved and moved to Active Tracking.",
      "Report Approved",
    );
  }, 300);
}

// Reject submitted report
function rejectReport(btn) {
  const row = btn.closest("tr");
  showPageConfirmation(
    "Are you sure you want to reject this report? This action cannot be undone.",
    "Confirm Rejection",
    async () => {
      const reportNo = row.dataset.reportId;
      const ok = await postReportAction({ action: "reject", reportNo });
      if (!ok) {
        showPagePopup(
          "Could not reject this report. Please try again.",
          "Rejection Failed",
        );
        return;
      }
      row.style.transition = "all 0.3s ease";
      row.style.opacity = "0";
      setTimeout(() => row.remove(), 300);
    },
    "Reject",
  );
}

// Update Active Investigation Status
async function updateStatus(btn, targetStatus) {
  const row = btn.closest("tr");
  const reportNo = row.dataset.reportId;

  if (targetStatus === "Investigation") {
    const ok = await postReportAction({ action: "investigate", reportNo });
    if (!ok) {
      showPagePopup(
        "Could not update this case. Please try again.",
        "Update Failed",
      );
      return;
    }
    const badge = row.querySelector(".badge");
    badge.className = "badge badge-orange";
    badge.textContent = "IN INVESTIGATION";
    loadSavedReportsAndAlerts();
    showPagePopup("Case updated to In Investigation.", "Case Updated");
  } else if (targetStatus === "Resolved") {
    const ok = await postReportAction({ action: "resolve", reportNo });
    if (!ok) {
      showPagePopup(
        "Could not resolve this case. Please try again.",
        "Update Failed",
      );
      return;
    }
    row.style.transition = "all 0.3s ease";
    row.style.opacity = "0";
    setTimeout(() => {
      row.remove();
      showPagePopup(
        "Case marked as Resolved and moved to Report Records.",
        "Case Resolved",
      );
    }, 300);
  }
}

// SOS Alert Dispatch
async function dispatchSOS(btn) {
  const row = btn.closest("tr");
  const badge = row.querySelector(".badge");
  if (
    badge.textContent.trim() === "DISPATCHED" ||
    badge.textContent.trim() === "RESPONDED"
  ) {
    showPagePopup("Guard is already dispatched.", "Dispatch Update");
    return;
  }
  const sosNo = row.dataset.alertId;
  const ok = await postReportAction({ action: "dispatch", sosNo });
  if (!ok) {
    showPagePopup(
      "Could not dispatch a guard. Please try again.",
      "Dispatch Failed",
    );
    return;
  }
  loadSavedReportsAndAlerts();
}

// SOS Alert Respond
async function respondSOS(btn) {
  const row = btn.closest("tr");
  const sosNo = row.dataset.alertId;
  const ok = await postReportAction({ action: "respond", sosNo });
  if (!ok) {
    showPagePopup(
      "Could not update this alert. Please try again.",
      "Update Failed",
    );
    return;
  }
  loadSavedReportsAndAlerts();
}

function openStoredReport(reportNo) {
  const report = cachedReports.find((item) => item.reportNo === reportNo);
  if (!report) return;
  document.getElementById("modalCaseNo").textContent =
    `REPORT CASE NO. #${report.reportNo}`;
  const isAnon = report.isAnonymous === "true";
  document.getElementById("accountInfoSection").style.display = isAnon
    ? "none"
    : "block";
  document.getElementById("modalDivider").style.display = isAnon
    ? "none"
    : "block";
  document.getElementById("accFullName").textContent = report.fullName;
  document.getElementById("accGradeSec").textContent =
    report.gradeSection || "-";
  document.getElementById("accUsername").textContent = report.username;
  document.getElementById("accAdviser").textContent = report.adviser || "-";
  document.getElementById("accLRN").textContent = report.lrn || "-";
  document.getElementById("accEmail").textContent = report.email || "-";
  document.getElementById("repCategory").textContent = report.category;
  document.getElementById("repDateTime").textContent = report.dateTime;
  document.getElementById("repLocation").textContent = report.location;
  document.getElementById("repDescription").textContent = report.description;
  document.getElementById("reportModal").classList.add("active");
}

// Close Modal
function closeReportModal() {
  const modal = document.getElementById("reportModal");
  modal.classList.remove("active");
}

// Close Modal when clicking background overlay
function closeModalOnOverlay(event) {
  if (event.target.classList.contains("modal-overlay")) {
    closeReportModal();
  }
}

// Suspend Student Account Action
function suspendStudent(reportId) {
  const duration = prompt(
    `Enter suspension duration (days) for reporter of ${reportId}:`,
    "7",
  );
  if (duration) {
    showPagePopup(
      `Account associated with ${reportId} has been suspended for ${duration} days.`,
      "Account Suspended",
    );
  }
}

// Ban Student Account Action
function banStudent(reportId) {
  showPageConfirmation(
    `Are you sure you want to PERMANENTLY BAN the student who submitted ${reportId}? This will revoke their platform access.`,
    "Confirm Permanent Ban",
    () => {
      showPagePopup(
        `Account associated with ${reportId} has been permanently banned.`,
        "Account Banned",
      );
    },
    "Ban Account",
  );
}

async function loadSavedReportsAndAlerts() {
  const newReportsBody = document.getElementById("newReportsBody");
  const activeReportsBody = document.getElementById("activeReportsBody");
  const sosAlertsBody = document.getElementById("sosAlertsBody");

  let reports = [];
  let alerts = [];
  try {
    const [reportsRes, alertsRes] = await Promise.all([
      fetch("../../../AdminReportServlet"),
      fetch("../../../AdminReportServlet?type=sos"),
    ]);
    if (reportsRes.status === 401 || alertsRes.status === 401) {
      return redirectToLoginOnSessionExpiry();
    }
    reports = await reportsRes.json();
    alerts = await alertsRes.json();
  } catch (err) {
    // Server unreachable -- leave the tables empty / show the empty-state message below.
  }
  cachedReports = reports;
  cachedAlerts = alerts;

  if (newReportsBody) newReportsBody.innerHTML = "";
  if (activeReportsBody) activeReportsBody.innerHTML = "";
  if (sosAlertsBody) sosAlertsBody.innerHTML = "";

  const addEmptyState = (body, message, columns) => {
    if (body && !body.children.length) {
      body.innerHTML = `<tr class="empty-record-row"><td colspan="${columns}">${message}</td></tr>`;
    }
  };

  reports
    .filter((report) => report.status === "Pending")
    .forEach((report) => {
      const row = document.createElement("tr");
      row.dataset.reportId = report.reportNo;
      row.dataset.lrn = report.lrn || "";
      row.innerHTML = `<td>#${report.reportNo}</td><td>${report.dateTime}</td><td>${report.fullName}</td><td>${report.category}</td><td>${report.description}</td><td><div class="action-buttons"><button class="btn btn-approve" onclick="approveReport(this)">Approve</button><button class="btn btn-reject" onclick="rejectReport(this)">Reject</button></div></td>`;
      newReportsBody?.prepend(row);
    });

  reports
    .filter(
      (report) =>
        report.status === "Active" || report.status === "Under Investigation",
    )
    .forEach((report) => {
      const row = document.createElement("tr");
      row.dataset.reportId = report.reportNo;
      row.dataset.lrn = report.lrn || "";
      const isInvestigation = report.status === "Under Investigation";
      const badgeClass = isInvestigation ? "badge-orange" : "badge-warning";
      const label = isInvestigation ? "IN INVESTIGATION" : "ACTIVE";
      const investigateAction = !isInvestigation
        ? `<button class="btn btn-more" onclick="updateStatus(this, 'Investigation')">Mark Investigating</button>`
        : "";
      row.innerHTML = `<td>#${report.reportNo}</td><td>${report.fullName} (${report.lrn})</td><td>${report.category}</td><td><span class="badge ${badgeClass}">${label}</span></td><td><div class="action-buttons"><button class="btn btn-scan" onclick="openStoredReport('${report.reportNo}')">Scan Details</button>${investigateAction}<button class="btn btn-more" onclick="updateStatus(this, 'Resolved')">Mark Resolved</button><button class="btn btn-message" onclick="messageReporter('${report.lrn || ""}')">Message Student</button></div></td>`;
      activeReportsBody?.prepend(row);
    });
  addEmptyState(newReportsBody, "No new report requests.", 6);
  addEmptyState(activeReportsBody, "No active reports to track.", 5);

  alerts.forEach((alertData) => {
    const row = document.createElement("tr");
    row.dataset.alertId = alertData.sosNo;
    const isAnonymous = !alertData.username;
    const status = alertData.status || "Active";
    const dispatchAction =
      status === "Dispatched" || status === "Responded"
        ? ""
        : '<button class="btn btn-more" onclick="dispatchSOS(this)">Dispatch Guard</button>';
    const responseAction =
      status === "Responded"
        ? ""
        : '<button class="btn btn-scan" onclick="respondSOS(this)">Mark Responded</button>';
    const messageAction = isAnonymous
      ? ""
      : `<button class="btn btn-message" onclick="messageReporter('${alertData.lrn}')">Message Student</button>`;
    const badgeClass =
      status === "Responded" ? "badge-success" : "badge-danger";
    row.innerHTML = `<td>${alertData.dateTime}</td><td>${alertData.lrn} (${alertData.username})</td><td>${alertData.location}</td><td>${alertData.description || "No description provided."}</td><td><span class="badge ${badgeClass}">${status.toUpperCase()}</span></td><td><div class="action-buttons">${dispatchAction}${responseAction}${messageAction}</div></td>`;
    sosAlertsBody?.prepend(row);
  });
  addEmptyState(sosAlertsBody, "No emergency SOS cases found.", 6);
}

function messageReporter(lrn) {
  if (!lrn) {
    showPagePopup(
      "Anonymous reports cannot receive direct messages.",
      "Message Unavailable",
    );
    return;
  }
  window.location.href = `../adminMessages/adminMessage.html?lrn=${encodeURIComponent(lrn)}`;
}

// If we arrived here via "View Linked Case" from the Messages page, jump
// straight to that student's row and highlight it.
function focusLinkedCase() {
  const targetLrn = new URLSearchParams(window.location.search).get("lrn");
  if (!targetLrn) return;

  const matchingRow = document.querySelector(
    `#activeReportsBody tr[data-lrn="${targetLrn}"], #newReportsBody tr[data-lrn="${targetLrn}"]`,
  );

  if (matchingRow) {
    matchingRow.scrollIntoView({ behavior: "smooth", block: "center" });
    matchingRow.classList.add("row-highlight");
    setTimeout(() => matchingRow.classList.remove("row-highlight"), 2500);
  } else {
    showPagePopup(
      "This student has no active or pending case right now.",
      "No Active Case",
    );
  }
}

loadSavedReportsAndAlerts().then(focusLinkedCase);
