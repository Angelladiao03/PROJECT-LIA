// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function loadStoredRecords() {
    const tableBody = document.getElementById('recordsTableBody');
    if (!tableBody || typeof localDatabase === 'undefined') return;
    tableBody.innerHTML = '';
    const resolvedReports = localDatabase.read(localDatabase.reportsKey).filter(report => report.status === 'resolved');
    if (!resolvedReports.length) {
        tableBody.innerHTML = '<tr class="empty-record-row"><td colspan="6">No resolved report records found.</td></tr>';
        return;
    }
    resolvedReports.forEach(report => {
        const row = document.createElement('tr');
        row.id = `row-${report.id}`;
        row.innerHTML = `<td class="case-id">#${report.id}</td><td><div class="student-name">${report.fullName}</div><div class="student-sub">LRN: ${report.lrn}</div></td><td>${report.category}</td><td>${new Date(report.dateTime).toLocaleDateString()}</td><td><span class="badge badge-success">Resolved</span></td><td><div class="action-buttons"><button class="btn-action btn-view" onclick="viewStoredRecord('${report.id}')">Scan Details</button><button class="btn-action btn-delete" onclick="deleteRecord('row-${report.id}', '#${report.id}')">Delete</button></div></td>`;
        tableBody.appendChild(row);
    });
}

loadStoredRecords();

function viewStoredRecord(reportId) {
    const report = localDatabase.read(localDatabase.reportsKey).find(item => item.id === reportId);
    if (!report) return;
    viewRecord({ caseId: `#${report.id}`, fullName: report.fullName, gradeSection: report.gradeSection || '-', username: report.username, adviser: '-', lrn: report.lrn, email: '-', category: report.category, dateTime: report.dateTime, location: report.location, description: report.description });
}

// Filter Records in Archive
function filterRecords() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const categoryValue = document.getElementById('categoryFilter').value;
    const yearValue = document.getElementById('yearFilter').value;

    const rows = document.querySelectorAll('#recordsTableBody tr');

    rows.forEach(row => {
        if (row.classList.contains('empty-record-row')) return;
        const text = row.textContent.toLowerCase();
        const category = row.children[2].textContent;
        const dateResolved = row.children[3].textContent;

        const matchesSearch = text.includes(searchValue);
        const matchesCategory = (categoryValue === 'ALL' || category === categoryValue);
        const matchesYear = (yearValue === 'ALL' || dateResolved.includes(yearValue));

        if (matchesSearch && matchesCategory && matchesYear) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Open Detailed View Modal (Populated with image format parameters)
function viewRecord(data) {
    document.getElementById('modalCaseTitle').textContent = `REPORT CASE NO. ${data.caseId}`;
    document.getElementById('modalFullName').textContent = data.fullName;
    document.getElementById('modalGradeSection').textContent = data.gradeSection;
    document.getElementById('modalUsername').textContent = data.username;
    document.getElementById('modalAdviser').textContent = data.adviser;
    document.getElementById('modalLrn').textContent = data.lrn;
    document.getElementById('modalEmail').textContent = data.email;

    document.getElementById('modalCategory').textContent = data.category;
    document.getElementById('modalDateTime').textContent = data.dateTime;
    document.getElementById('modalLocation').textContent = data.location;
    document.getElementById('modalDescription').textContent = data.description;

    document.getElementById('reportModal').classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('reportModal').classList.remove('active');
}

// Delete Record Function
function deleteRecord(rowId, caseId) {
    const reports = localDatabase.read(localDatabase.reportsKey);
    const report = reports.find(item => item.id === caseId.replace('#', ''));
    const anonymousNotice = report?.username === 'Anonymous'
        ? ' This anonymous report will be permanently deleted now that the case is resolved, so your data will not be stored.'
        : '';
    const confirmed = confirm(`Are you sure you want to delete record ${caseId}? This action cannot be undone.${anonymousNotice}`);
    if (confirmed) {
        const targetRow = document.getElementById(rowId);
        if (targetRow) {
            targetRow.remove();
            localDatabase.write(localDatabase.reportsKey, reports.filter(item => item.id !== caseId.replace('#', '')));
        }
    }
}