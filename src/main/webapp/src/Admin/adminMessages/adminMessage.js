function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

let currentLrn = null;

function formatTime(dbDateTime) {
    if (!dbDateTime) return '';
    const date = new Date(dbDateTime.replace(' ', 'T'));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// CHANGED: now async, loads the sidebar list from AdminMessageServlet
async function renderStudentList() {
    const list = document.getElementById('studentList');
    list.innerHTML = '';

    let conversations = [];
    try {
        const res = await fetch('../../../AdminMessageServlet');
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
        item.innerHTML = `<div class="student-avatar">${initials}</div><div class="student-info"><div class="student-top"><span class="student-name">${convo.fullName}</span><span class="chat-time">${formatTime(convo.lastTime)}</span></div><div class="student-bottom"><span class="last-msg">${convo.lastText}</span></div></div>`;
        item.addEventListener('click', () => selectStudent(convo.lrn, convo.fullName, item));
        list.appendChild(item);
    });
}

function selectStudent(lrn, fullName, item) {
    currentLrn = lrn;
    document.querySelectorAll('.student-item').forEach(element => element.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('activeStudentName').textContent = fullName;
    document.getElementById('activeStudentSub').textContent = 'Student conversation';
    renderMessages();
}

// CHANGED: now async, loads one student's conversation from AdminMessageServlet
async function renderMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    if (!currentLrn) return;

    try {
        const res = await fetch(`../../../AdminMessageServlet?lrn=${encodeURIComponent(currentLrn)}`);
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

// CHANGED: now async, sends the admin's reply to AdminMessageServlet
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
    window.location.href = '../adminManageReports/adminManage.html';
}

renderStudentList();