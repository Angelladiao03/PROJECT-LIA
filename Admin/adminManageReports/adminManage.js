// Toggle Sidebar Collapsed State
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// Toggle Action Dropdown Menu
function toggleDropdown(btn) {
    // Close other open dropdowns first
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== btn.nextElementSibling) {
            menu.classList.remove('show');
        }
    });
    const dropdownMenu = btn.nextElementSibling;
    dropdownMenu.classList.toggle('show');
}

// Close dropdowns if user clicks anywhere outside
window.onclick = function(event) {
    if (!event.target.matches('.btn-more')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}

// Approve submitted report
function approveReport(btn) {
    const row = btn.closest('tr');
    updateStoredReport(row, 'pending');
    row.style.transition = 'all 0.3s ease';
    row.style.opacity = '0';
    setTimeout(() => {
        row.remove();
        loadSavedReportsAndAlerts();
        showPagePopup('Report approved and moved to Active Tracking.', 'Report Approved');
    }, 300);
}

// Reject submitted report
function rejectReport(btn) {
    const row = btn.closest('tr');
    if (confirm('Are you sure you want to reject this report?')) {
        updateStoredReport(row, 'rejected');
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 300);
    }
}

function updateStoredReport(row, status) {
    const reportId = row.dataset.reportId;
    if (!reportId) return;
    const reports = localDatabase.read(localDatabase.reportsKey);
    const report = reports.find(item => item.id === reportId);
    if (report) {
        report.status = status;
        localDatabase.write(localDatabase.reportsKey, reports);
    }
}

// Update Active Investigation Status
function updateStatus(btn, targetStatus) {
    const row = btn.closest('tr');
    const badge = row.querySelector('.badge');
    const reportId = row.dataset.reportId;
    const reports = localDatabase.read(localDatabase.reportsKey);
    const report = reports.find(item => item.id === reportId);
    
    if (targetStatus === 'Investigation') {
        if (report) report.status = 'investigation';
        badge.className = 'badge badge-orange';
        badge.textContent = 'IN INVESTIGATION';
        localDatabase.write(localDatabase.reportsKey, reports);
        showPagePopup('Case updated to In Investigation.', 'Case Updated');
    } else if (targetStatus === 'Resolved') {
        if (report) {
            if (report.username === 'Anonymous') {
                localDatabase.write(localDatabase.reportsKey, reports.filter(item => item.id !== report.id));
            } else {
                report.status = 'resolved';
                localDatabase.write(localDatabase.reportsKey, reports);
            }
        }
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => {
            row.remove();
            showPagePopup(report?.username === 'Anonymous'
                ? 'Anonymous case resolved. The report was deleted so no identifying data is stored.'
                : 'Case marked as Resolved and moved to Report Records.', 'Case Resolved');
        }, 300);
    }
}

// SOS Alert Dispatch
function dispatchSOS(btn) {
    const row = btn.closest('tr');
    const badge = row.querySelector('.badge');
    if (badge.textContent.trim() === 'DISPATCHED') {
        showPagePopup('Guard is already dispatched.', 'Dispatch Update');
        return;
    }
    badge.className = 'badge badge-danger';
    badge.textContent = 'DISPATCHED';
    updateStoredAlert(row, 'DISPATCHED');
    showPagePopup('Security has been dispatched to the reported location.', 'Security Dispatched');
}

// SOS Alert Respond
function respondSOS(btn) {
    const row = btn.closest('tr');
    const badge = row.querySelector('.badge');
    badge.className = 'badge badge-success';
    badge.textContent = 'RESPONDED';
    updateStoredAlert(row, 'RESPONDED');
    const actionCell = btn.closest('td');
    actionCell.innerHTML = '<span class="text-muted">Completed</span>';
}

function updateStoredAlert(row, status) {
    const alertId = row.dataset.alertId;
    if (!alertId) return;
    const alerts = localDatabase.read(localDatabase.sosKey);
    const alert = alerts.find(item => item.id === alertId);
    if (alert) {
        alert.status = status;
        localDatabase.write(localDatabase.sosKey, alerts);
    }
}

// Open Modal with specific data mode ('known' vs 'anon')
function openReportModal(type) {
    const modal = document.getElementById('reportModal');
    const accountSection = document.getElementById('accountInfoSection');
    const divider = document.getElementById('modalDivider');
    const caseHeader = document.getElementById('modalCaseNo');

    if (type === 'known') {
        caseHeader.textContent = "REPORT CASE NO. #REP-1042";
        accountSection.style.display = "block";
        divider.style.display = "block";

        document.getElementById('accFullName').textContent = "LeBronny Mouse";
        document.getElementById('accGradeSec').textContent = "Grade 10 - Acacia";
        document.getElementById('accUsername').textContent = "student123";
        document.getElementById('accAdviser').textContent = "Mrs. Santos";
        document.getElementById('accLRN').textContent = "123456789012";
        document.getElementById('accEmail').textContent = "lebronny@lagroschool.edu.ph";

        document.getElementById('repCategory').textContent = "Verbal Harassment";
        document.getElementById('repDateTime').textContent = "August 18, 2026 - 10:30 AM";
        document.getElementById('repLocation').textContent = "2nd Floor Building B Corridor";
        document.getElementById('repDescription').textContent = "Student was repeatedly mocked and threatened by a group of classmates during recess near the stairwell.";

    } else if (type === 'anon') {
        caseHeader.textContent = "REPORT CASE NO. #REP-1038 (ANONYMOUS)";
        accountSection.style.display = "none";
        divider.style.display = "none";

        document.getElementById('repCategory').textContent = "Social Exclusion";
        document.getElementById('repDateTime').textContent = "August 17, 2026 - 2:15 PM";
        document.getElementById('repLocation').textContent = "Cafeteria";
        document.getElementById('repDescription').textContent = "Group of students preventing victim from joining lunch table and spreading false rumours.";
    }

    modal.classList.add('active');
}

function openStoredReport(reportId) {
    const report = localDatabase.read(localDatabase.reportsKey).find(item => item.id === reportId);
    if (!report) return;
    document.getElementById('modalCaseNo').textContent = `REPORT CASE NO. #${report.id}`;
    document.getElementById('accountInfoSection').style.display = report.username === 'Anonymous' ? 'none' : 'block';
    document.getElementById('modalDivider').style.display = report.username === 'Anonymous' ? 'none' : 'block';
    document.getElementById('accFullName').textContent = report.fullName;
    document.getElementById('accGradeSec').textContent = report.gradeSection || '-';
    document.getElementById('accUsername').textContent = report.username;
    document.getElementById('accAdviser').textContent = '-';
    document.getElementById('accLRN').textContent = report.lrn || '-';
    document.getElementById('accEmail').textContent = '-';
    document.getElementById('repCategory').textContent = report.category;
    document.getElementById('repDateTime').textContent = report.dateTime;
    document.getElementById('repLocation').textContent = report.location;
    document.getElementById('repDescription').textContent = report.description;
    document.getElementById('reportModal').classList.add('active');
}

// Close Modal
function closeReportModal() {
    const modal = document.getElementById('reportModal');
    modal.classList.remove('active');
}

// Close Modal when clicking background overlay
function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeReportModal();
    }
}

// Suspend Student Account Action
function suspendStudent(reportId) {
    const duration = prompt(`Enter suspension duration (days) for reporter of ${reportId}:`, "7");
    if (duration) {
        showPagePopup(`Account associated with ${reportId} has been suspended for ${duration} days.`, 'Account Suspended');
    }
}

// Ban Student Account Action
function banStudent(reportId) {
    if (confirm(`Are you sure you want to PERMANENTLY BAN the student who submitted ${reportId}? This will revoke their platform access.`)) {
        showPagePopup(`Account associated with ${reportId} has been permanently banned.`, 'Account Banned');
    }
}

function loadSavedReportsAndAlerts() {
    const reports = JSON.parse(localStorage.getItem('lagroInActionReports') || '[]');
    const newReportsBody = document.getElementById('newReportsBody');
    const alerts = JSON.parse(localStorage.getItem('lagroInActionSosAlerts') || '[]');
    const sosAlertsBody = document.getElementById('sosAlertsBody');

    if (newReportsBody) newReportsBody.innerHTML = '';
    const activeReportsBody = document.getElementById('activeReportsBody');
    if (activeReportsBody) activeReportsBody.innerHTML = '';
    if (sosAlertsBody) sosAlertsBody.innerHTML = '';

    const addEmptyState = (body, message, columns) => {
        if (body && !body.children.length) {
            body.innerHTML = `<tr class="empty-record-row"><td colspan="${columns}">${message}</td></tr>`;
        }
    };

    reports.filter(report => report.status === 'requested').forEach(report => {
        const row = document.createElement('tr');
        row.dataset.reportId = report.id;
        row.innerHTML = `<td>#${report.id}</td><td>${new Date(report.createdAt).toLocaleDateString()}</td><td>${report.fullName}</td><td>${report.category}</td><td>${report.description}</td><td><div class="action-buttons"><button class="btn btn-approve" onclick="approveReport(this)">Approve</button><button class="btn btn-reject" onclick="rejectReport(this)">Reject</button></div></td>`;
        newReportsBody?.prepend(row);
    });

    reports.filter(report => report.status === 'pending' || report.status === 'investigation').forEach(report => {
        const row = document.createElement('tr');
        row.dataset.reportId = report.id;
        const badgeClass = report.status === 'investigation' ? 'badge-orange' : 'badge-warning';
        const label = report.status === 'investigation' ? 'IN INVESTIGATION' : 'PENDING';
        row.innerHTML = `<td>#${report.id}</td><td>${report.fullName} (${report.lrn})</td><td>${report.category}</td><td><span class="badge ${badgeClass}">${label}</span></td><td><div class="action-buttons"><button class="btn btn-scan" onclick="openStoredReport('${report.id}')">Scan Details</button><button class="btn btn-more" onclick="updateStatus(this, 'Investigation')">Mark Investigating</button><button class="btn btn-more" onclick="updateStatus(this, 'Resolved')">Mark Resolved</button><button class="btn btn-message" onclick="messageReporter('${encodeURIComponent(report.username || '')}')">Message Student</button></div></td>`;
        activeReportsBody?.prepend(row);
    });
    addEmptyState(newReportsBody, 'No new report requests.', 6);
    addEmptyState(activeReportsBody, 'No active reports to track.', 5);

    alerts.forEach(alertData => {
        const row = document.createElement('tr');
        row.dataset.alertId = alertData.id;
        const isAnonymous = alertData.username === 'Anonymous student' || alertData.username === 'Anonymous';
        const dispatchButton = alertData.status === 'DISPATCHED' ? 'Guard Dispatched' : 'Dispatch Guard';
        const responseAction = alertData.status === 'RESPONDED' ? '<span class="text-muted">Completed</span>' : '<button class="btn btn-scan" onclick="respondSOS(this)">Mark Responded</button>';
        row.innerHTML = `<td>${new Date(alertData.createdAt).toLocaleTimeString()}</td><td>${alertData.lrn} (${alertData.username})</td><td>${alertData.location}</td><td>${alertData.description || 'No description provided.'}</td><td><span class="badge ${alertData.status === 'RESPONDED' ? 'badge-success' : 'badge-danger'}">${alertData.status}</span></td><td><div class="action-buttons"><button class="btn btn-more" onclick="dispatchSOS(this)">${dispatchButton}</button>${isAnonymous ? '' : `<button class="btn btn-message" onclick="messageReporter('${encodeURIComponent(alertData.username)}')">Message Student</button>`}${responseAction}</div></td>`;
        sosAlertsBody?.prepend(row);
    });
    addEmptyState(sosAlertsBody, 'No emergency SOS cases found.', 6);
}

function messageReporter(username) {
    if (!username) {
        showPagePopup('Anonymous reports cannot receive direct messages.', 'Message Unavailable');
        return;
    }
    window.location.href = `../adminMessages/adminMessage.html?username=${username}`;
}

loadSavedReportsAndAlerts();