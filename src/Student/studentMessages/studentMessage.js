// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Chat Functionality
function handleSendMessage(event) {
    event.preventDefault();

    const input = document.getElementById('messageInput');
    const chatBody = document.getElementById('chatBody');
    const text = input.value.trim();

    if (!text) return;

    // Current time format
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append student message
    const msgContainer = document.createElement('div');
    msgContainer.className = 'message student-message';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = timeString;

    msgContainer.appendChild(bubble);
    msgContainer.appendChild(timeSpan);

    chatBody.appendChild(msgContainer);

    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    localDatabase.addMessage({ sender: 'student', senderName: activeUser?.fullName || 'Student', username: activeUser?.username || 'Anonymous', text, time: timeString });

    // Reset input & scroll to bottom
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
}

function renderStoredMessages() {
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    const username = activeUser?.username || 'Anonymous';
    const chatBody = document.getElementById('chatBody');
    const messages = localDatabase.getMessages(username);

    // Use the MOST RECENT admin message, so the name updates if a different admin takes over
    const latestAdminMessage = [...messages].reverse().find(message => message.sender === 'admin');
    const adminNameEl = document.querySelector('.admin-name');
    if (adminNameEl) adminNameEl.textContent = latestAdminMessage?.senderName || 'Guidance Admin';

    let lastAdminSeen = null;
    messages.forEach(message => {
        // Drop in a banner whenever the admin handling the chat changes
        if (message.sender === 'admin' && message.senderName && message.senderName !== lastAdminSeen) {
            const banner = document.createElement('div');
            banner.className = 'system-message';
            banner.textContent = `You are now connected with ${message.senderName}.`;
            chatBody.appendChild(banner);
            lastAdminSeen = message.senderName;
        }

        const msgContainer = document.createElement('div');
        msgContainer.className = `message ${message.sender === 'admin' ? 'admin-message' : 'student-message'}`;
        msgContainer.innerHTML = '<div class="message-bubble"></div><span class="message-time"></span>';
        msgContainer.querySelector('.message-bubble').textContent = message.text;
        msgContainer.querySelector('.message-time').textContent = message.time;
        chatBody.appendChild(msgContainer);
    });
}

// Auto scroll on load
window.addEventListener('DOMContentLoaded', () => {
    renderStoredMessages();
    const chatBody = document.getElementById('chatBody');
    if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
});