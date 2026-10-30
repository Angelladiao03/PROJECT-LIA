// Sign-in page: Student or Guest.

const form = document.getElementById('signInForm');
const tabs = { student: document.getElementById('tabStudent'), guest: document.getElementById('tabGuest') };
const idLabel = document.getElementById('idLabel');
const idHint = document.getElementById('idHint');
const idInput = document.getElementById('identifier');

LIA.wirePasswordToggles();

function choose(kind) {
  form.kind.value = kind;
  tabs.student.setAttribute('aria-selected', String(kind === 'student'));
  tabs.guest.setAttribute('aria-selected', String(kind === 'guest'));
  idLabel.textContent = kind === 'guest' ? 'Guest ID' : 'Username or email';
  document.getElementById('authTitle').textContent = kind === 'guest' ? 'Guest log in' : 'Student log in';
  idInput.placeholder = kind === 'guest' ? 'LIA-' : '';
  idInput.autocapitalize = kind === 'guest' ? 'characters' : 'none';
  idHint.hidden = kind !== 'guest';
  LIA.showFormError(form, '');
  try { localStorage.setItem('lia-signin-kind', kind); } catch (e) {}
}
tabs.student.addEventListener('click', () => choose('student'));
tabs.guest.addEventListener('click', () => choose('guest'));
try { if (localStorage.getItem('lia-signin-kind') === 'guest') choose('guest'); } catch (e) {}
// After resetting a password, the reset page sends people here with their account filled in
const params = new URLSearchParams(location.search);
if (params.get('as')) { choose(params.get('as') === 'guest' ? 'guest' : 'student'); idInput.value = params.get('id') || ''; form.password.focus(); }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.identifier.value.trim()) return LIA.showFormError(form, form.kind.value === 'guest' ? 'Enter your guest ID.' : 'Enter your username or email.');
  if (!form.password.value) return LIA.showFormError(form, 'Enter your password.');
  try {
    await LIA.busy(form.querySelector('button[type=submit]'), () => LIA.api('auth/login.php', { body: new FormData(form) }));
    location.href = '/app/home.html';
  } catch (err) {
    LIA.showFormError(form, err.message);
  }
});

// Already signed in? Go straight in.
LIA.api('auth/me.php', { allow401: true })
  .then((me) => { location.href = me.role === 'admin' ? '/admin/index.html' : '/app/home.html'; })
  .catch(() => {});
