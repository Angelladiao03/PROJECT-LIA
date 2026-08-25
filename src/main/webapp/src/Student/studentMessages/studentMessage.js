// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Bounces the student back to login if the server-side session has expired
// (or was never created), instead of leaving the chat stuck empty.
function redirectToLoginOnSessionExpiry() {
    localStorage.removeItem('lagroInActionActiveUser');
    window.location.href = '../../../index.html';
}

// Converts the database's "2026-08-20 09:24:54" text into a readable clock time.
function formatTime(dbDateTime) {
    if (!dbDateTime) return '';
    const date = new Date(dbDateTime.replace(' ', 'T'));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessageToChat(sender, text, time) {
    const chatBody = document.getElementById('chatBody');
    const msgContainer = document.createElement('div');
    msgContainer.className = `message ${sender === 'Admin' ? 'admin-message' : 'student-message'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = time;

    msgContainer.appendChild(bubble);
    msgContainer.appendChild(timeSpan);
    chatBody.appendChild(msgContainer);
}

// Loads the student's real conversation with the guidance office from MessageServlet.
async function renderStoredMessages() {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    chatBody.innerHTML = '';

    const adminNameEl = document.querySelector('.admin-name');
    if (adminNameEl) adminNameEl.textContent = 'Guidance Admin';

    try {
        const res = await fetch('../../../MessageServlet');
        if (res.status === 401) return redirectToLoginOnSessionExpiry();
        const messages = await res.json();

        if (!messages.length) {
            const empty = document.createElement('div');
            empty.className = 'system-message';
            empty.textContent = 'No messages yet. Say hello!';
            chatBody.appendChild(empty);
        } else {
            messages.forEach(message => {
                appendMessageToChat(message.sender, message.text, formatTime(message.time));
            });
        }

        chatBody.scrollTop = chatBody.scrollHeight;
    } catch (error) {
        chatBody.innerHTML = '<div class="system-message">Could not load messages.</div>';
    }
}

// Sends the student's typed message to MessageServlet, then reloads the
// thread so it stays perfectly in sync with what's stored in the database.
async function handleSendMessage(event) {
    event.preventDefault();

    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    const params = new URLSearchParams({ text });

    try {
        const res = await fetch('../../../MessageServlet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        const data = await res.json();

        if (data.success) {
            // Reload the whole conversation so it stays perfectly in sync with the database
            await renderStoredMessages();
        } else {
            appendMessageToChat('System', data.message, '');
        }
    } catch (error) {
        appendMessageToChat('System', 'Could not reach the server.', '');
    }
}

// Auto scroll on load
window.addEventListener('DOMContentLoaded', () => {
    renderStoredMessages();
});