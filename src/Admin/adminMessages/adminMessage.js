function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

let currentUsername = null;

function getStudentMessages() {
    return localDatabase.read(localDatabase.messagesKey).filter(message => message.sender === 'student');
}

function getMessageRecipients() {
    const recipients = new Map(getStudentMessages().map(message => [message.username, message]));
    const approvedStudents = JSON.parse(localStorage.getItem('lagroInActionApprovedStudents') || '[]');
    approvedStudents.forEach(student => {
        if (student.username && !recipients.has(student.username)) {
            recipients.set(student.username, {
                username: student.username,
                fullName: student.fullName,
                time: '',
                text: 'No messages yet.'
            });
        }
    });
    return [...recipients.values()];
}

function renderStudentList() {
    const list = document.getElementById('studentList');
    const students = getMessageRecipients();
    list.innerHTML = '';

    if (!students.length) {
        list.innerHTML = '<p class="empty-state">No student conversations yet.</p>';
        return;
    }

    students.forEach(message => {
        const item = document.createElement('div');
        item.className = 'student-item';
        item.dataset.username = message.username;
        item.innerHTML = `<div class="student-avatar">${message.username.slice(0, 2).toUpperCase()}</div><div class="student-info"><div class="student-top"><span class="student-name">${message.fullName || message.username}</span><span class="chat-time">${message.time}</span></div><div class="student-bottom"><span class="last-msg">${message.text}</span></div></div>`;
        item.addEventListener('click', () => selectStudent(message.username, item));
        list.appendChild(item);
    });
}

function selectStudent(username, item) {
    currentUsername = username;
    document.querySelectorAll('.student-item').forEach(element => element.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('activeStudentName').textContent = username;
    document.getElementById('activeStudentSub').textContent = 'Student conversation';
    renderMessages();
}

function renderMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    if (!currentUsername) return;

    localDatabase.getMessages(currentUsername).forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message msg-${message.sender === 'admin' ? 'outgoing' : 'incoming'}`;
        messageElement.innerHTML = '<div class="msg-bubble"></div>';
        messageElement.querySelector('.msg-bubble').textContent = message.text;
        const messageTime = document.createElement('span');
        messageTime.className = 'message-time';
        messageTime.textContent = message.time;
        messageElement.appendChild(messageTime);
        container.appendChild(messageElement);
    });
    container.scrollTop = container.scrollHeight;
}

function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentUsername) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const activeAdmin = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    localDatabase.addMessage({ sender: 'admin', senderName: activeAdmin?.fullName || 'Guidance Admin', username: currentUsername, text, time });
    input.value = '';
    renderMessages();
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

const requestedUsername = new URLSearchParams(window.location.search).get('username');
renderStudentList();
if (requestedUsername) {
    const decodedUsername = decodeURIComponent(requestedUsername);
    const selectedItem = [...document.querySelectorAll('.student-item')].find(item => item.dataset.username === decodedUsername);
    if (selectedItem) selectStudent(decodedUsername, selectedItem);
}
