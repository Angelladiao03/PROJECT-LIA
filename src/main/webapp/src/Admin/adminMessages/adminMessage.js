function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

let currentLrn = null;
let currentStudentName = '';

function formatTime(dbDateTime) {
    if (!dbDateTime) return '';
    const date = new Date(dbDateTime.replace(' ', 'T'));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Loads the conversation list and restores deep-linked student selection.
async function renderStudentList() {
    const list = document.getElementById('studentList');
    list.innerHTML = '';

    let conversations = [];
    try {
        const res = await fetch('../../../AdminMessageServlet');
        if (!res.ok) throw new Error('Could not load conversations.');
        conversations = await res.json();
    } catch (error) {
        list.innerHTML = '<p class="empty-state">Could not load conversations.</p>';
        return;
    }

    if (!conversations.length) {
        list.innerHTML = '<p class="empty-state">No student conversations yet.</p>';
        return;
    }

    conversations.forEach(convo => {
        const item = document.createElement('div');
        item.className = 'student-item';
        item.dataset.lrn = convo.lrn;
        const initials = (convo.fullName || convo.lrn).slice(0, 2).toUpperCase();
        item.innerHTML = `<div class="student-avatar">${initials}</div><div class="student-info"><div class="student-top"><span class="student-name">${convo.fullName}</span><span class="chat-time">${formatTime(convo.lastTime)}</span></div><div class="student-bottom"><span class="last-msg">${convo.lastText || 'No messages yet'}</span></div></div>`;
        item.addEventListener('click', () => selectStudent(convo.lrn, convo.fullName, item));
        list.appendChild(item);
    });

    const targetLrn = new URLSearchParams(window.location.search).get('lrn');
    if (targetLrn) {
        const targetItem = list.querySelector(`.student-item[data-lrn="${targetLrn}"]`);
        if (targetItem) {
            targetItem.click();
            targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function selectStudent(lrn, fullName, item) {
    currentLrn = lrn;
    currentStudentName = fullName || lrn;
    document.querySelectorAll('.student-item').forEach(element => element.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('activeStudentName').textContent = currentStudentName;
    document.getElementById('activeStudentSub').textContent = 'Student conversation';
    renderMessages();
}

// Loads one selected student's message thread.
async function renderMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    if (!currentLrn) return;

    try {
        const res = await fetch(`../../../AdminMessageServlet?lrn=${encodeURIComponent(currentLrn)}`);
        if (!res.ok) throw new Error('Could not load messages.');
        const messages = await res.json();

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message msg-${message.sender === 'Admin' ? 'outgoing' : 'incoming'}`;
            messageElement.innerHTML = '<div class="msg-bubble"></div>';
            messageElement.querySelector('.msg-bubble').textContent = message.text;
            const messageTime = document.createElement('span');
            messageTime.className = 'message-time';
            messageTime.textContent = formatTime(message.time);
            messageElement.appendChild(messageTime);
            container.appendChild(messageElement);
        });
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        container.innerHTML = '<div class="system-message">Could not load messages.</div>';
    }
}

// Sends an admin reply then refreshes both thread and sidebar previews.
async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentLrn) return;

    input.value = '';

    const params = new URLSearchParams({ lrn: currentLrn, text });

    try {
        const res = await fetch('../../../AdminMessageServlet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        if (!res.ok) throw new Error('Could not send message.');
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
    const filter = document.getElementById('studentSearch').value.toLowerCase();
    document.querySelectorAll('.student-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(filter) ? 'flex' : 'none';
    });
}

function viewCaseDetails() {
    if (!currentLrn) {
        showPagePopup('Select a student conversation first.', 'No Student Selected');
        return;
    }
    window.location.href = `../adminManageReports/adminManage.html?lrn=${encodeURIComponent(currentLrn)}`;
}

function closeStudentInfoModal() {
    document.getElementById('studentInfoModal')?.classList.add('hidden');
}

function closeStudentInfoOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) closeStudentInfoModal();
}

// Opens the selected student's profile details for quick admin review.
async function viewStudentInfo() {
    if (!currentLrn) {
        showPagePopup('Select a student conversation first.', 'No Student Selected');
        return;
    }

    try {
        const res = await fetch(`../../../AdminMessageServlet?action=studentInfo&lrn=${encodeURIComponent(currentLrn)}`);
        if (!res.ok) throw new Error('Could not load student information.');
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Could not load student information.');

        document.getElementById('infoFullName').textContent = data.fullName || currentStudentName;
        document.getElementById('infoLrn').textContent = data.lrn || currentLrn;
        document.getElementById('infoUsername').textContent = data.username || '-';
        document.getElementById('infoGradeSection').textContent = data.gradeSection || '-';
        document.getElementById('infoAdviser').textContent = data.adviser || '-';
        document.getElementById('infoEmail').textContent = data.email || '-';
        document.getElementById('infoStatus').textContent = data.status || '-';
        document.getElementById('studentInfoModal').classList.remove('hidden');
    } catch (error) {
        showPagePopup(error.message || 'Could not load student information.', 'View Student Info');
    }
}

renderStudentList();