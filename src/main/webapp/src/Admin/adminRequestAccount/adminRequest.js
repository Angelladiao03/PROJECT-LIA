const studentsData = {};
let currentPendingCount = 0;

async function loadPendingRequests() {
    const tableBody = document.getElementById('requestsTableBody');
    try {
        const res = await fetch('../../../AdminRequestServlet');
        const registrations = await res.json();

        tableBody.innerHTML = '';
        if (!registrations.length) {
            tableBody.innerHTML = '<tr class="empty-record-row"><td colspan="4">No pending registration requests.</td></tr>';
        }
        registrations.forEach(student => {
            const id = student.lrn;
            studentsData[id] = student;
            tableBody.insertAdjacentHTML('beforeend', `
                <tr id="row-${id}">
                    <td>${new Date(student.registeredAt).toLocaleDateString()}</td>
                    <td><strong>${student.fullName}</strong></td>
                    <td>${student.lrn}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-scan" onclick="scanStudent('${id}')">Scan</button>
                            <button onclick="approveStudent('${id}')" class="btn btn-approve">Approve</button>
                            <button onclick="rejectStudent('${id}')" class="btn btn-reject">Reject</button>
                        </div>
                    </td>
                </tr>`);
        });

        currentPendingCount = registrations.length;
        document.getElementById('pendingCount').textContent = currentPendingCount;
    } catch (err) {
        tableBody.innerHTML = '<tr class="empty-record-row"><td colspan="4">Could not load registration requests.</td></tr>';
    }
}

loadPendingRequests();

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// Open Scan Modal
function scanStudent(id) {
    const student = studentsData[id];
    if (!student) return;

    document.getElementById('modalFullName').textContent = student.fullName;
    document.getElementById('modalUsername').textContent = student.username;
    document.getElementById('modalLRN').textContent = student.lrn;
    document.getElementById('modalGradeSec').textContent = student.gradeSection;
    document.getElementById('modalAdviser').textContent = student.adviser;
    document.getElementById('modalEmail').textContent = student.email;

    document.getElementById('studentModal').classList.add('active');
}

// Close Modal
function closeStudentModal() {
    document.getElementById('studentModal').classList.remove('active');
}

// Close Modal on Overlay Click
function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeStudentModal();
    }
}

// Approve Student
async function approveStudent(id, name) {
    name = name || studentsData[id]?.fullName;
    const ok = await sendDecision(id, 'approve');
    if (!ok) {
        showPagePopup('Could not approve this student. Please try again.', 'Approval Failed');
        return;
    }
    const row = document.getElementById(`row-${id}`);
    if (row) {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => {
            row.remove();
            updatePendingCount();
            showPagePopup(`Account request for ${name} has been approved.`, 'Account Approved');
        }, 300);
    }
}

// Reject Student
async function rejectStudent(id, name) {
    name = name || studentsData[id]?.fullName;
    if (!confirm(`Are you sure you want to reject registration for ${name}?`)) return;

    const ok = await sendDecision(id, 'reject');
    if (!ok) {
        showPagePopup('Could not reject this student. Please try again.', 'Rejection Failed');
        return;
    }
    const row = document.getElementById(`row-${id}`);
    if (row) {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => {
            row.remove();
            updatePendingCount();
        }, 300);
    }
}

async function sendDecision(lrn, action) {
    try {
        const res = await fetch('../../../AdminRequestServlet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=${encodeURIComponent(action)}&lrn=${encodeURIComponent(lrn)}`
        });
        const data = await res.json();
        return !!data.success;
    } catch (err) {
        return false;
    }
}

// Update Counter Badge
function updatePendingCount() {
    currentPendingCount--;
    document.getElementById('pendingCount').textContent = currentPendingCount;
}
