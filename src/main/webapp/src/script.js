// Function to switch between Student Login, Student Signup, and Admin Login
window.addEventListener('load', () => {
    document.getElementById('pageLoader').classList.add('loaded');
});

function showForm(sectionId) {
    document.getElementById('studentLoginSection').classList.add('hidden');
    document.getElementById('studentSignupSection').classList.add('hidden');
    document.getElementById('adminLoginSection').classList.add('hidden');

    document.getElementById(sectionId).classList.remove('hidden');
}

const registeredStudentsKey = 'lagroInActionRegisteredStudents';
const approvedStudentsKey = 'lagroInActionApprovedStudents';
const activeUserKey = 'lagroInActionActiveUser';
const loginDraftKey = 'lagroInActionLoginDraft';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.auth-form').forEach(form => {
        const draftKey = `${loginDraftKey}-${form.onsubmit?.toString().includes("'student'") ? 'student' : form.onsubmit?.toString().includes('handleRegistration') ? 'registration' : 'admin'}`;
        try {
            const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
            form.querySelectorAll('input').forEach((input, index) => {
                if (input.type !== 'password' && draft[index]) input.value = draft[index];
            });
        } catch (error) {
            localStorage.removeItem(draftKey);
        }
        form.addEventListener('input', () => {
            const values = [...form.querySelectorAll('input')].map(input => input.type === 'password' ? '' : input.value);
            localStorage.setItem(draftKey, JSON.stringify(values));
        });
    });
});

function getRegisteredStudents() {
    try {
        return JSON.parse(localStorage.getItem(registeredStudentsKey)) || [];
    } catch (error) {
        return [];
    }
}

function getApprovedStudents() {
    try {
        return JSON.parse(localStorage.getItem(approvedStudentsKey)) || [];
    } catch (error) {
        return [];
    }
}

function setFormMessage(form, message) {
    const messageElement = form.parentElement.querySelector('.form-message');
    messageElement.textContent = message;
    messageElement.className = `form-message${message ? ' error' : ''}`;
}

function validateRequiredFields(form) {
    const emptyInput = Array.from(form.querySelectorAll('[required]')).find(input => !input.value.trim());
    if (emptyInput) {
        setFormMessage(form, `Please input your ${emptyInput.dataset.field}.`);
        emptyInput.focus();
        return false;
    }
    const invalidInput = form.querySelector('input:invalid');
    if (invalidInput) {
        setFormMessage(form, `Please input a valid ${invalidInput.dataset.field}.`);
        invalidInput.focus();
        return false;
    }
    return true;
}

function showPopup(message, title, onOkay) {
    const popup = document.getElementById('messagePopup');
    document.getElementById('popupTitle').textContent = title;
    document.getElementById('popupMessage').textContent = message;
    popup.classList.remove('hidden');
    const okayButton = document.getElementById('popupOkay');
    okayButton.onclick = () => {
        popup.classList.add('hidden');
        if (onOkay) onOkay();
    };
    popup.onkeydown = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            okayButton.click();
        }
        if (event.key === 'Escape') popup.classList.add('hidden');
    };
    okayButton.focus();
}

// CHANGED: added "async" so we can use "await" with fetch() inside
async function handleLogin(event, role) {
    event.preventDefault();

    const form = event.target;
    if (!validateRequiredFields(form)) return;
    setFormMessage(form, '');
    const username = form.elements[0].value.trim();
    const password = form.elements[role === 'student' ? 2 : 1].value;

        if (role === 'admin') {
        const params = new URLSearchParams({ username, password });
        try {
            const res = await fetch('AdminLoginServlet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem(activeUserKey, JSON.stringify({ role: 'admin', username, fullName: data.fullName }));
                showAuthLoading('Signing in...', 'src/Admin/adminHome/adminHome.html');
                return;
            } else {
                setFormMessage(form, data.message);
                return;
            }
        } catch (error) {
            setFormMessage(form, 'Could not reach the server. Please try again.');
            return;
        }
    } else {
        // CHANGED: student login now asks the real database via LoginServlet
        const params = new URLSearchParams({ username, password });

        try {
            const res = await fetch('LoginServlet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem(activeUserKey, JSON.stringify({ role: 'student', username, lrn: data.lrn, fullName: data.fullName }));
                showAuthLoading('Signing in...', 'src/Student/studentHome/studentHome.html');
                return;
            } else {
                setFormMessage(form, data.message);
                return;
            }
        } catch (error) {
            setFormMessage(form, 'Could not reach the server. Please try again.');
            return;
        }
    }

    setFormMessage(form, 'Invalid login credentials. Your LRN may not be registered yet or your details are incorrect.');
}

// CHANGED: added "async" so we can use "await" with fetch() inside
async function handleRegistration(event) {
    event.preventDefault();

    const form = event.target;
    if (!validateRequiredFields(form)) return;
    const inputs = Array.from(form.querySelectorAll('input'));
    const [fullName, username, lrn, gradeSection, adviser, email, password, confirmPassword] = inputs.map(input => input.value.trim());

    if (password !== confirmPassword) {
        setFormMessage(form, 'Passwords do not match.');
        return;
    }

    showAuthLoading('Creating account...');

    // CHANGED: registration now sends data to RegisterServlet instead of localStorage
    const params = new URLSearchParams({
        lrn, fullName, username, password, rePassword: confirmPassword, adviser, gradeSection, email
    });

    try {
        const res = await fetch('RegisterServlet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        const data = await res.json();

        document.getElementById('pageLoader')?.classList.add('loaded');

        if (data.success) {
            localStorage.removeItem(`${loginDraftKey}-registration`);
            form.reset();
            showPopup('Registration Completed! Please wait for admin approval to access our website.', 'Registration Completed', () => {
                showForm('studentLoginSection');
            });
        } else {
            setFormMessage(form, data.message);
        }
    } catch (error) {
        document.getElementById('pageLoader')?.classList.add('loaded');
        setFormMessage(form, 'Could not reach the server. Please try again.');
    }
}

function showAuthLoading(message, destination) {
    const loader = document.getElementById('pageLoader');
    const label = loader?.querySelector('span');
    if (label) label.textContent = message;
    loader?.classList.remove('loaded');
    if (destination) setTimeout(() => { window.location.href = destination; }, 350);
}