// Sign-in page: Student or Guest.

const form = document.getElementById('signInForm');
const tabs = { student: document.getElementById('tabStudent'), guest: document.getElementById('tabGuest') };
const idLabel = document.getElementById('idLabel');
const idHint = document.getElementById('idHint');
const idInput = document.getElementById('identifier');

LIA.wirePasswordToggles();
LIA.noAutofill(form); // a saved username and password are never filled in by themselves

function choose(kind) {
  form.kind.value = kind;
  tabs.student.setAttribute('aria-selected', String(kind === 'student'));
  tabs.guest.setAttribute('aria-selected', String(kind === 'guest'));
  idLabel.textContent = kind === 'guest' ? 'Guest ID' : 'Username or email';
  idInput.value = '';
  form.password.value = '';
  document.getElementById('authTitle').textContent = kind === 'guest' ? 'Guest log in' : 'Student log in';
  idInput.placeholder = kind === 'guest' ? 'LIA-' : '';
  idInput.autocapitalize = kind === 'guest' ? 'characters' : 'none';
  idHint.hidden = kind !== 'guest';
  LIA.showFormError(form, '');
  idInput.removeAttribute('aria-invalid'); form.password.removeAttribute('aria-invalid');
  tabs.student.classList.remove('hint-tab'); tabs.guest.classList.remove('hint-tab');
  try { localStorage.setItem('lia-signin-kind', kind); } catch (e) {}
}
tabs.student.addEventListener('click', () => choose('student'));
tabs.guest.addEventListener('click', () => choose('guest'));
try { if (localStorage.getItem('lia-signin-kind') === 'guest') choose('guest'); } catch (e) {}
// After resetting a password, the reset page opens the right tab (Student or Guest)
const params = new URLSearchParams(location.search);
if (params.get('as')) choose(params.get('as') === 'guest' ? 'guest' : 'student');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.identifier.value.trim()) return LIA.showFormError(form, form.kind.value === 'guest' ? 'Enter your guest ID.' : 'Enter your username or email.');
  // A guest ID (LIA-7K3P9Q) on the Student tab: tell them to use the Guest tab (the server checks this too)
  if (form.kind.value === 'student' && /^LIA-[A-Z0-9]{6}$/i.test(form.identifier.value.replace(/\s+/g, ''))) {
    LIA.showFormError(form, 'That is a guest ID. Guest accounts sign in on the Guest tab, not the Student tab.');
    idInput.setAttribute('aria-invalid', 'true');
    tabs.guest.classList.add('hint-tab');
    return;
  }
  if (!form.password.value) return LIA.showFormError(form, 'Enter your password.');
  try {
    await LIA.busy(form.querySelector('button[type=submit]'), () => LIA.api('auth/login.php', { body: new FormData(form) }));
    location.href = '/app/home.html';
  } catch (err) {
    LIA.showFormError(form, err.message);
    // Red outline on the boxes so it's clear the sign-in didn't work
    if (err.status === 401) [idInput, form.password].forEach((f) => f.setAttribute('aria-invalid', 'true'));
    if (err.data?.useTab) idInput.setAttribute('aria-invalid', 'true');
    // Right account, wrong tab: make the tab to use stand out
    if (err.data?.useTab) tabs[err.data.useTab].classList.add('hint-tab');
  }
});
// The red outline goes away as soon as they type again
[idInput, form.password].forEach((f) => f.addEventListener('input', () => {
  idInput.removeAttribute('aria-invalid'); form.password.removeAttribute('aria-invalid');
}));

// Already signed in? Go straight in.
LIA.api('auth/me.php', { allow401: true })
  .then((me) => { location.href = me.role === 'admin' ? LIA.staffHome(me.account) : '/app/home.html'; })
  .catch(() => {});
