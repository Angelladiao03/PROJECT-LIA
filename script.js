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
const demoStudent = {
    role: 'student',
    fullName: 'Student Test',
    username: 'student123',
    lrn: '012345678901',
    gradeSection: '12 - Rossum',
    adviser: 'Mr. Richard Zabala',
    email: 'student1@gmail.com',
    password: 'student123'
};

function initializeApprovedStudents() {
    let approvedStudents = [];
    try {
        approvedStudents = JSON.parse(localStorage.getItem(approvedStudentsKey) || '[]');
    } catch (error) {
        approvedStudents = [];
    }

    approvedStudents = approvedStudents.filter(student => student.username !== 'lebronny_mous' && student.lrn !== '136632140011');
    approvedStudents = approvedStudents.filter(student => student.username !== demoStudent.username);
    approvedStudents.push(demoStudent);
    localStorage.setItem(approvedStudentsKey, JSON.stringify(approvedStudents));
}

initializeApprovedStudents();

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

function handleLogin(event, role) {
    event.preventDefault();

    const form = event.target;
    if (!validateRequiredFields(form)) return;
    setFormMessage(form, '');
    const username = form.elements[0].value.trim();
    const password = form.elements[role === 'student' ? 2 : 1].value;

    if (role === 'admin') {
        if (username === 'admin123' && password === 'admin123') {
            localStorage.setItem(activeUserKey, JSON.stringify({ role: 'admin', username, fullName: 'Guidance Admin' }));
            showAuthLoading('Signing in...', 'Admin/adminHome/adminHome.html');
            return;
        }
    } else {
        const lrn = form.elements[1].value.trim();
        const registeredStudent = getApprovedStudents().find(student =>
            student.username === username && student.password === password && student.lrn === lrn
        );

        if (registeredStudent) {
            localStorage.setItem(activeUserKey, JSON.stringify(registeredStudent));
            showAuthLoading('Signing in...', 'Student/studentHome/studentHome.html');
            return;
        }
    }

    setFormMessage(form, 'Invalid login credentials. Your LRN may not be registered yet or your details are incorrect.');
}

function handleRegistration(event) {
    event.preventDefault();

    const form = event.target;
    if (!validateRequiredFields(form)) return;
    const inputs = Array.from(form.querySelectorAll('input'));
    const [fullName, username, lrn, gradeSection, adviser, email, password, confirmPassword] = inputs.map(input => input.value.trim());
    const pendingStudents = getRegisteredStudents();
    const students = [...pendingStudents, ...getApprovedStudents()];

    if (password !== confirmPassword) {
        setFormMessage(form, 'Passwords do not match.');
        return;
    }

    const duplicateUsername = students.some(student => student.username === username);
    const duplicateLrn = students.some(student => student.lrn === lrn);
    const duplicateEmail = students.some(student => (student.email || '').toLowerCase() === email.toLowerCase());
    if (duplicateUsername || duplicateLrn || duplicateEmail) {
        const duplicateField = duplicateUsername ? 'Username' : duplicateLrn ? 'LRN' : 'Email';
        setFormMessage(form, `${duplicateField} is already registered.`);
        return;
    }

    showAuthLoading('Creating account...');
    setTimeout(() => {
    pendingStudents.push({
        role: 'student',
        fullName,
        username,
        lrn,
        gradeSection,
        adviser,
        email,
        password,
        registeredAt: new Date().toISOString()
    });

    localStorage.setItem(registeredStudentsKey, JSON.stringify(pendingStudents));
    localStorage.removeItem(`${loginDraftKey}-registration`);
    form.reset();
    document.getElementById('pageLoader')?.classList.add('loaded');
    showPopup('Registration Completed! Please wait for admin approval to access our website.', 'Registration Completed', () => {
        showForm('studentLoginSection');
    });
    }, 350);
}

function showAuthLoading(message, destination) {
    const loader = document.getElementById('pageLoader');
    const label = loader?.querySelector('span');
    if (label) label.textContent = message;
    loader?.classList.remove('loaded');
    if (destination) setTimeout(() => { window.location.href = destination; }, 350);
}