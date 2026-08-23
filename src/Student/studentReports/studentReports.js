// Toggle Sidebar Collapse
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function loadActiveStudent() {
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    if (!activeUser || activeUser.role !== 'student') return;

    const fields = {
        displayFullName: activeUser.fullName,
        displayUsername: `@${activeUser.username}`,
        displayLrn: activeUser.lrn,
        displayGradeSection: activeUser.gradeSection,
        displayAdviser: activeUser.adviser,
        displayGmail: activeUser.email,
        topbarUsername: activeUser.username
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) element.textContent = value;
    });
}

loadActiveStudent();

function loadSubmittedReports() {
    const reports = JSON.parse(localStorage.getItem('lagroInActionReports') || '[]');
    const tableBody = document.getElementById('reportsTableBody');
    if (!tableBody) return;

    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    const studentReports = reports.filter(report => activeUser && (report.username === activeUser.username || report.submittedBy === activeUser.username));
    const counts = { requested: 0, pending: 0, submitted: 0, resolved: 0 };
    studentReports.forEach(report => {
        const status = report.status === 'investigation' ? 'submitted' : report.status;
        if (counts[status] !== undefined) counts[status] += 1;
    });
    Object.entries(counts).forEach(([status, count]) => {
        const element = document.getElementById(`count${status[0].toUpperCase()}${status.slice(1)}`);
        if (element) element.textContent = count;
    });

    if (!studentReports.length) {
        tableBody.innerHTML = '<tr class="empty-report-row"><td colspan="6">No reports submitted yet.</td></tr>';
        return;
    }

    studentReports.slice().reverse().forEach(report => {
            const row = document.createElement('tr');
            row.dataset.status = report.status === 'investigation' ? 'submitted' : report.status;
            row.innerHTML = `<td class="report-id">#${report.id}</td><td>${report.category}</td><td>${report.location}</td><td>${report.fullName}</td><td>${new Date(report.dateTime).toLocaleString()}</td><td><span class="status-text status-${report.status}">${report.status.replace('-', ' ').toUpperCase()}</span></td>`;
            tableBody.prepend(row);
        });
}

loadSubmittedReports();
// Filter Table Reports
function filterReports(status, buttonElement) {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    const tableBody = document.getElementById('reportsTableBody');
    const rows = tableBody.querySelectorAll('tr:not(.empty-report-row)');
    let visibleRows = 0;
    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (status === 'all' || rowStatus === status) {
            row.style.display = '';
            visibleRows++;
        } else {
            row.style.display = 'none';
        }
    });

    let emptyRow = tableBody.querySelector('.empty-report-row');
    if (!visibleRows) {
        if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-report-row';
            emptyRow.innerHTML = '<td colspan="6"></td>';
            tableBody.appendChild(emptyRow);
        }
        emptyRow.querySelector('td').textContent = status === 'all'
            ? 'No reports submitted yet.'
            : `No ${status.replace('-', ' ')} reports submitted yet.`;
        emptyRow.style.display = '';
    } else if (emptyRow) {
        emptyRow.style.display = 'none';
    }
}

// Edit Profile Modal Functions
function openEditProfileModal() {
    document.getElementById('editFullName').value = document.getElementById('displayFullName').textContent;
    document.getElementById('editUsername').value = document.getElementById('displayUsername').textContent.replace('@', '');
    document.getElementById('editLrn').value = document.getElementById('displayLrn').textContent;
    document.getElementById('editGradeSection').value = document.getElementById('displayGradeSection').textContent;
    document.getElementById('editAdviser').value = document.getElementById('displayAdviser').textContent;
    document.getElementById('editGmail').value = document.getElementById('displayGmail').textContent;

    document.getElementById('editProfileModal').classList.remove('hidden');
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').classList.add('hidden');
}

function handleProfileUpdate(e) {
    e.preventDefault();

    const newFullName = document.getElementById('editFullName').value.trim();
    const newUsername = document.getElementById('editUsername').value.trim();
    const newLrn = document.getElementById('editLrn').value.trim();
    const newGradeSection = document.getElementById('editGradeSection').value.trim();
    const newAdviser = document.getElementById('editAdviser').value.trim();
    const newGmail = document.getElementById('editGmail').value.trim();

    document.getElementById('displayFullName').textContent = newFullName;
    document.getElementById('displayUsername').textContent = `@${newUsername}`;
    document.getElementById('displayLrn').textContent = newLrn;
    document.getElementById('displayGradeSection').textContent = newGradeSection;
    document.getElementById('displayAdviser').textContent = newAdviser;
    document.getElementById('displayGmail').textContent = newGmail;

    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser'));
    if (activeUser && activeUser.role === 'student') {
        const registeredStudents = JSON.parse(localStorage.getItem('lagroInActionRegisteredStudents') || '[]');
        const approvedStudents = JSON.parse(localStorage.getItem('lagroInActionApprovedStudents') || '[]');
        const registeredStudent = registeredStudents.find(student => student.username === activeUser.username);
        const approvedStudent = approvedStudents.find(student => student.username === activeUser.username);
        Object.assign(activeUser, {
            fullName: newFullName,
            username: newUsername,
            lrn: newLrn,
            gradeSection: newGradeSection,
            adviser: newAdviser,
            email: newGmail
        });
        localStorage.setItem('lagroInActionActiveUser', JSON.stringify(activeUser));
        if (registeredStudent) {
            Object.assign(registeredStudent, activeUser);
            localStorage.setItem('lagroInActionRegisteredStudents', JSON.stringify(registeredStudents));
        }
        if (approvedStudent) {
            Object.assign(approvedStudent, activeUser);
            localStorage.setItem('lagroInActionApprovedStudents', JSON.stringify(approvedStudents));
        }
    }

    const topbarUser = document.getElementById('topbarUsername');
    if (topbarUser) {
        topbarUser.textContent = newUsername;
    }

    showPagePopup('Your profile information was updated successfully.', 'Profile Updated');
    closeEditProfileModal();
}

function handleLogout() {
    handlePageLogout();
}

function selectReportStatus(status) {
    const tab = [...document.querySelectorAll('.tab-btn')].find(button => button.getAttribute('onclick')?.includes(`'${status}'`));
    if (tab) filterReports(status, tab);
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}