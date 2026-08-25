// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Converts SQL datetime text into chat-friendly local time.
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

// Loads the full student-admin conversation from the server.
async function renderStoredMessages() {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    chatBody.innerHTML = '';

    const adminNameEl = document.querySelector('.admin-name');
    if (adminNameEl) adminNameEl.textContent = 'Guidance Admin';

    try {
        const res = await fetch('../../../MessageServlet');
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

// Sends a student message, then refreshes the conversation thread.
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