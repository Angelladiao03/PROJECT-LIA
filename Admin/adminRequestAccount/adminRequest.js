const studentsData = {};
const approvedStudentsKey = 'lagroInActionApprovedStudents';

let currentPendingCount = 0;

function loadLocalRegistrations() {
    const registrations = JSON.parse(localStorage.getItem('lagroInActionRegisteredStudents') || '[]');
    const tableBody = document.getElementById('requestsTableBody');

    tableBody.innerHTML = '';
    registrations.forEach((student, index) => {
        const id = `local-${index}`;
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

    currentPendingCount += registrations.length;
    document.getElementById('pendingCount').textContent = currentPendingCount;
}

loadLocalRegistrations();

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
function approveStudent(id, name) {
    name = name || studentsData[id].fullName;
    const row = document.getElementById(`row-${id}`);
    if (!row) return;

    row.style.transition = 'all 0.3s ease';
    row.style.opacity = '0';
    setTimeout(() => {
        row.remove();
        approveLocalRegistration(id, name);
        updatePendingCount();
        showPagePopup(`Account request for ${name} has been approved.`, 'Account Approved');
    }, 300);
}

// Reject Student
function rejectStudent(id, name) {
    name = name || studentsData[id].fullName;
    if (confirm(`Are you sure you want to reject registration for ${name}?`)) {
        const row = document.getElementById(`row-${id}`);
        if (!row) return;

        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => {
            row.remove();
            removeLocalRegistration(id, name);
            updatePendingCount();
        }, 300);
    }
}

// Update Counter Badge
function updatePendingCount() {
    currentPendingCount--;
    document.getElementById('pendingCount').textContent = currentPendingCount;
}

function removeLocalRegistration(id, name) {
    if (!String(id).startsWith('local-')) return;
    const registrations = JSON.parse(localStorage.getItem('lagroInActionRegisteredStudents') || '[]');
    const index = registrations.findIndex(student => student.fullName === name);
    if (index >= 0) registrations.splice(index, 1);
    localStorage.setItem('lagroInActionRegisteredStudents', JSON.stringify(registrations));
}

function approveLocalRegistration(id, name) {
    if (!String(id).startsWith('local-')) return;
    const registrations = JSON.parse(localStorage.getItem('lagroInActionRegisteredStudents') || '[]');
    const pendingStudent = studentsData[id];
    const index = registrations.findIndex(student => pendingStudent && student.username === pendingStudent.username && student.lrn === pendingStudent.lrn);
    if (index < 0) return;
    const [student] = registrations.splice(index, 1);
    const approvedStudents = JSON.parse(localStorage.getItem(approvedStudentsKey) || '[]');
    const existingIndex = approvedStudents.findIndex(item => item.username === student.username || item.lrn === student.lrn);
    const approvedStudent = { ...student, role: 'student', approvedAt: new Date().toISOString() };
    if (existingIndex >= 0) approvedStudents[existingIndex] = approvedStudent;
    else approvedStudents.push(approvedStudent);
    localStorage.setItem('lagroInActionRegisteredStudents', JSON.stringify(registrations));
    localStorage.setItem(approvedStudentsKey, JSON.stringify(approvedStudents));
}