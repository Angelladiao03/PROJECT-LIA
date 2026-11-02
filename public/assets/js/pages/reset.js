// Forgot password:
//   1. type your username or guest ID  ->  a link is emailed to your account's address (shown partly hidden)
//   2. the link opens this page again with ?token=...  ->  choose a new password  ->  done

const steps = [...document.querySelectorAll('[data-step]')];
const askForm = document.getElementById('askForm');
const resetForm = document.getElementById('resetForm');
const token = new URLSearchParams(location.search).get('token');

LIA.wirePasswordToggles();
const show = (n) => {
  steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
  steps[n - 1].querySelector('input, a.btn, button')?.focus();
};

askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = askForm.identifier.value.trim();
  if (!identifier) return LIA.showFormError(askForm, 'Enter your username or guest ID.');
  try {
    const data = await LIA.busy(askForm.querySelector('button[type=submit]'), () => LIA.api('auth/reset_send.php', { body: { identifier } }));
    LIA.showFormError(askForm, '');
    document.getElementById('sentTo').textContent = data.sentTo;
    const dev = document.getElementById('devLink');
    dev.hidden = !data.devLink;
    if (data.devLink) dev.innerHTML = `Testing mode (no email service set up): <a href="${LIA.esc(data.devLink)}">open the reset link</a>`;
    show(2);
  } catch (err) { LIA.showFormError(askForm, err.message); }
});
document.getElementById('again').addEventListener('click', () => show(1));

// Opened from the email: check the link first
if (token) {
  show(3);
  LIA.api('auth/reset_confirm.php?token=' + encodeURIComponent(token))
    .then((d) => { document.getElementById('forWho').textContent = `For ${d.signInAs === 'guest' ? 'guest' : 'student'} account ${d.name}.`; })
    .catch((err) => {
      LIA.showFormError(resetForm, err.message);
      resetForm.querySelector('button[type=submit]').disabled = true;
      resetForm.insertAdjacentHTML('beforeend', '<p style="text-align:center;margin:12px 0 0"><a href="/reset.html">Ask for a new link</a></p>');
    });
}

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (resetForm.newPassword.value !== resetForm.confirmPassword.value) return LIA.showFormError(resetForm, "The new passwords don't match.");
  try {
    const body = new FormData(resetForm);
    body.append('token', token);
    const data = await LIA.busy(resetForm.querySelector('button[type=submit]'), () => LIA.api('auth/reset_confirm.php', { body }));
    history.replaceState(null, '', '/reset.html'); // the link can't be used again, so take it out of the address bar
    document.getElementById('toSignIn').href = `/index.html?as=${data.signInAs}`;
    show(4);
  } catch (err) { LIA.showFormError(resetForm, err.message); }
});
