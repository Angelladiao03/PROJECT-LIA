// Toggle Sidebar Collapse
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// A 401 here means the session expired (or the tab sat open past the
// timeout) - send the student back to login instead of a blank page.
function redirectToLoginOnSessionExpiry() {
    localStorage.removeItem('lagroInActionActiveUser');
    window.location.href = '../../../index.html';
}

// Pulls the student's real profile so "My Account" reflects the db,
// not the stale copy cached in localStorage at login time.
async function loadActiveStudent() {
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    if (!activeUser || activeUser.role !== 'student') return;

    let profile = null;
    try {
        const res = await fetch('../../../StudentProfileServlet');
        if (res.status === 401) return redirectToLoginOnSessionExpiry();
        const data = await res.json();
        if (data.success) profile = data;
    } catch (error) {
        // couldn't reach the server - fall back to the cached copy below
    }

    const fields = {
        displayFullName: profile?.fullName || activeUser.fullName,
        displayUsername: `@${profile?.username || activeUser.username}`,
        displayLrn: profile?.lrn || activeUser.lrn,
        displayGradeSection: profile?.gradeSection || activeUser.gradeSection,
        displayAdviser: profile?.adviser || activeUser.adviser,
        displayGmail: profile?.email || activeUser.email,
        displayContact: profile?.contactNumber || activeUser.contactNumber,
        topbarUsername: profile?.username || activeUser.username
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) element.textContent = value;
    });

    // keep localStorage in sync so other pages (topbar name, etc.) stay accurate
    if (profile) {
        Object.assign(activeUser, {
            fullName: profile.fullName,
            username: profile.username,
            lrn: profile.lrn,
            gradeSection: profile.gradeSection,
            adviser: profile.adviser,
            email: profile.email,
            contactNumber: profile.contactNumber
        });
        localStorage.setItem('lagroInActionActiveUser', JSON.stringify(activeUser));
    }
}

loadActiveStudent();

// Maps db status text to the short codes the stat cards / filter tabs use
function mapDbStatus(dbStatus) {
    const map = {
        'Pending': 'requested',
        'Active': 'pending',
        'Under Investigation': 'submitted',
        'Resolved': 'resolved'
    };
    return map[dbStatus] || 'requested';
}

// Loads this student's report history and fills in the status cards + table
async function loadSubmittedReports() {
    const tableBody = document.getElementById('reportsTableBody');
    if (!tableBody) return;

    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');

    let studentReports = [];
    try {
        const res = await fetch('../../../MyReportsServlet');
        if (res.status === 401) return redirectToLoginOnSessionExpiry();
        studentReports = await res.json();
    } catch (error) {
        tableBody.innerHTML = '<tr class="empty-report-row"><td colspan="6">Could not load reports. Please try again.</td></tr>';
        return;
    }

    const counts = { requested: 0, pending: 0, submitted: 0, resolved: 0 };
    studentReports.forEach(report => {
        const status = mapDbStatus(report.status);
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

    tableBody.innerHTML = '';
    studentReports.forEach(report => {
        const status = mapDbStatus(report.status);
        const row = document.createElement('tr');
        row.dataset.status = status;
        row.innerHTML = `<td class="report-id">#${report.reportNo}</td><td>${report.category}</td><td>${report.location}</td><td>${activeUser?.fullName || ''}</td><td>${new Date(report.dateTime).toLocaleString()}</td><td><span class="status-text status-${status}">${status.replace('-', ' ').toUpperCase()}</span></td>`;
        tableBody.appendChild(row);
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
function setEditProfileMessage(message) {
    const messageElement = document.getElementById('editProfileMessage');
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.className = `form-message${message ? ' error' : ''}`;
}

function openEditProfileModal() {
    document.getElementById('editFullName').value = document.getElementById('displayFullName').textContent;
    document.getElementById('editUsername').value = document.getElementById('displayUsername').textContent.replace('@', '');
    document.getElementById('editLrn').value = document.getElementById('displayLrn').textContent;
    document.getElementById('editGradeSection').value = document.getElementById('displayGradeSection').textContent;
    document.getElementById('editAdviser').value = document.getElementById('displayAdviser').textContent;
    document.getElementById('editGmail').value = document.getElementById('displayGmail').textContent;
    document.getElementById('editContact').value = document.getElementById('displayContact').textContent;
    setEditProfileMessage('');

    document.getElementById('editProfileModal').classList.remove('hidden');
}

function closeEditProfileModal() {
    setEditProfileMessage('');
    document.getElementById('editProfileModal').classList.add('hidden');
}

function handleProfileUpdate(e) {
    e.preventDefault();

    const newUsername = document.getElementById('editUsername').value.trim();
    const newGradeSection = document.getElementById('editGradeSection').value.trim();
    const newAdviser = document.getElementById('editAdviser').value.trim();
    const currentUsername = document.getElementById('displayUsername').textContent.replace('@', '');

    // show the exact reason under the form instead of a popup
    if (!newGradeSection) {
        setEditProfileMessage('Please enter your grade and section.');
        return;
    }
    if (!newAdviser) {
        setEditProfileMessage("Please enter your adviser's name.");
        return;
    }
    const validationError = validateUsername(newUsername);
    if (validationError) {
        setEditProfileMessage(validationError);
        return;
    }
    setEditProfileMessage('');

    // changing the username changes their login, so confirm first
    if (newUsername !== currentUsername) {
        showPageConfirmation(
            'Do you want to proceed? The username will change.',
            'Confirm Username Change',
            () => saveProfileUpdate(newUsername, newGradeSection, newAdviser),
            'Yes',
            'No',
        );
        return;
    }

    saveProfileUpdate(newUsername, newGradeSection, newAdviser);
}

async function saveProfileUpdate(newUsername, newGradeSection, newAdviser) {
    const params = new URLSearchParams({ username: newUsername, gradeSection: newGradeSection, adviser: newAdviser });

    let data;
    try {
        const res = await fetch('../../../StudentProfileServlet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        data = await res.json();
    } catch (error) {
        setEditProfileMessage('Could not reach the server. Please try again.');
        return;
    }

    if (!data.success) {
        setEditProfileMessage(data.message || 'Could not update your profile.');
        return;
    }

    document.getElementById('displayUsername').textContent = `@${newUsername}`;
    document.getElementById('displayGradeSection').textContent = newGradeSection;
    document.getElementById('displayAdviser').textContent = newAdviser;

    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser'));
    if (activeUser && activeUser.role === 'student') {
        Object.assign(activeUser, { username: newUsername, gradeSection: newGradeSection, adviser: newAdviser });
        localStorage.setItem('lagroInActionActiveUser', JSON.stringify(activeUser));
    }

    const topbarUser = document.getElementById('topbarUsername');
    if (topbarUser) topbarUser.textContent = newUsername;

    closeEditProfileModal();
    showPagePopup('Your profile information was updated successfully.', 'Profile Updated');
}

function handleLogout() {
    handlePageLogout();
}

function selectReportStatus(status) {
    const tab = [...document.querySelectorAll('.tab-btn')].find(button => button.getAttribute('onclick')?.includes(`'${status}'`));
    if (tab) filterReports(status, tab);
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}