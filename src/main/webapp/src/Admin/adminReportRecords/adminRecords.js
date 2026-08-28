// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
}

// Bounces the admin back to login if the server-side session has expired
// (or was never created), instead of leaving the table stuck empty.
function redirectToLoginOnSessionExpiry() {
  localStorage.removeItem("lagroInActionActiveUser");
  window.location.href = "../../../index.html";
}

let cachedResolvedReports = [];

async function loadStoredRecords() {
  const tableBody = document.getElementById("recordsTableBody");
  if (!tableBody) return;

  let reports = [];
  try {
    const res = await fetch("../../../AdminReportServlet");
    if (res.status === 401) return redirectToLoginOnSessionExpiry();
    reports = await res.json();
  } catch (err) {
    tableBody.innerHTML =
      '<tr class="empty-record-row"><td colspan="6">Could not load report records.</td></tr>';
    return;
  }

  const resolvedReports = reports.filter(
    (report) => report.status === "Resolved",
  );
  cachedResolvedReports = resolvedReports;

  tableBody.innerHTML = "";
  if (!resolvedReports.length) {
    tableBody.innerHTML =
      '<tr class="empty-record-row"><td colspan="6">No resolved report records found.</td></tr>';
    return;
  }
  resolvedReports.forEach((report) => {
    const row = document.createElement("tr");
    row.id = `row-${report.reportNo}`;
    row.innerHTML = `<td class="case-id">#${report.reportNo}</td><td><div class="student-name">${report.fullName}</div><div class="student-sub">LRN: ${report.lrn}</div></td><td>${report.category}</td><td>${report.dateTime}</td><td><span class="badge badge-success">Resolved</span></td><td><div class="action-buttons"><button class="btn-action btn-view" onclick="viewStoredRecord('${report.reportNo}')">Scan Details</button>${report.isAnonymous === "true" ? "" : `<button class="btn-action btn-message" onclick="messageRecordOwner('${report.lrn}')">Message</button>`}<button class="btn-action btn-delete" onclick="deleteRecord('row-${report.reportNo}', '#${report.reportNo}')">Delete</button></div></td>`;
    tableBody.appendChild(row);
  });
}

loadStoredRecords();

function viewStoredRecord(reportNo) {
  const report = cachedResolvedReports.find(
    (item) => item.reportNo === reportNo,
  );
  if (!report) return;
  viewRecord({
    caseId: `#${report.reportNo}`,
    fullName: report.fullName,
    gradeSection: report.gradeSection || "-",
    username: report.username,
    adviser: report.adviser || "-",
    lrn: report.lrn,
    email: report.email || "-",
    category: report.category,
    dateTime: report.dateTime,
    location: report.location,
    description: report.description,
  });
}

// Filter Records in Archive
function filterRecords() {
  const searchValue = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const categoryValue = document.getElementById("categoryFilter").value;
  const yearValue = document.getElementById("yearFilter").value;

  const rows = document.querySelectorAll("#recordsTableBody tr");

  rows.forEach((row) => {
    if (row.classList.contains("empty-record-row")) return;
    const text = row.textContent.toLowerCase();
    const category = row.children[2].textContent;
    const dateResolved = row.children[3].textContent;

    const matchesSearch = text.includes(searchValue);
    const matchesCategory =
      categoryValue === "ALL" ||
      category === categoryValue ||
      (categoryValue === "Others" && category.startsWith("Others ("));
    const matchesYear = yearValue === "ALL" || dateResolved.includes(yearValue);

    if (matchesSearch && matchesCategory && matchesYear) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Open Detailed View Modal (Populated with image format parameters)
function viewRecord(data) {
  document.getElementById("modalCaseTitle").textContent =
    `REPORT CASE NO. ${data.caseId}`;
  document.getElementById("modalFullName").textContent = data.fullName;
  document.getElementById("modalGradeSection").textContent = data.gradeSection;
  document.getElementById("modalUsername").textContent = data.username;
  document.getElementById("modalAdviser").textContent = data.adviser;
  document.getElementById("modalLrn").textContent = data.lrn;
  document.getElementById("modalEmail").textContent = data.email;

  document.getElementById("modalCategory").textContent = data.category;
  document.getElementById("modalDateTime").textContent = data.dateTime;
  document.getElementById("modalLocation").textContent = data.location;
  document.getElementById("modalDescription").textContent = data.description;

  document.getElementById("reportModal").classList.add("active");
}

// Close Modal
function closeModal() {
  document.getElementById("reportModal").classList.remove("active");
}

// Delete Record Function
function deleteRecord(rowId, caseId) {
  const reportNo = caseId.replace("#", "");
  const report = cachedResolvedReports.find(
    (item) => item.reportNo === reportNo,
  );
  const anonymousNotice =
    report?.isAnonymous === "true"
      ? " This anonymous report will be permanently deleted now that the case is resolved, so your data will not be stored."
      : "";
  showPageConfirmation(
    `Are you sure you want to delete record ${caseId}? This action cannot be undone.${anonymousNotice}`,
    "Confirm Report Deletion",
    async () => {
      const res = await fetch("../../../AdminReportServlet", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `action=reject&reportNo=${encodeURIComponent(reportNo)}`,
      });
      const data = await res.json();
      if (!data.success) {
        showPagePopup(
          "Could not delete this record. Please try again.",
          "Delete Failed",
        );
        return;
      }
      const targetRow = document.getElementById(rowId);
      if (targetRow) targetRow.remove();
      showPagePopup(
        `Report case ${caseId} was deleted successfully.`,
        "Report Deleted",
      );
    },
  );
}

function messageRecordOwner(lrn) {
  window.location.href = `../adminMessages/adminMessage.html?lrn=${encodeURIComponent(lrn)}`;
}
