// Forgot password: email -> code + new password -> done.

const steps = [...document.querySelectorAll('[data-step]')];
const emailForm = document.getElementById('emailForm');
const resetForm = document.getElementById('resetForm');
let email = '';

LIA.wirePasswordToggles();
const show = (n) => {
  steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
  steps[n - 1].querySelector('input, a.btn')?.focus();
};

// Coming from "Reset password" on the sign-up page fills in the email
const fromLink = new URLSearchParams(location.search).get('email');
if (fromLink) emailForm.email.value = fromLink;

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  email = emailForm.email.value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return LIA.showFormError(emailForm, 'Enter a valid email address, like name@gmail.com.');
  try {
    const data = await LIA.busy(emailForm.querySelector('button[type=submit]'), () => LIA.api('auth/reset_send.php', { body: { email } }));
    LIA.showFormError(emailForm, '');
    document.getElementById('sentTo').innerHTML = `We sent a code to <b>${LIA.esc(email)}</b>. Check your inbox and spam folder. It works for 10 minutes.`;
    const dev = document.getElementById('devCode');
    dev.hidden = !data.devCode;
    if (data.devCode) dev.innerHTML = `Testing mode (no email service set up): your code is <b>${data.devCode}</b>`;
    show(2);
  } catch (err) { LIA.showFormError(emailForm, err.message); }
});

resetForm.code.addEventListener('input', () => { resetForm.code.value = resetForm.code.value.replace(/\D/g, '').slice(0, 6); });

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (resetForm.code.value.length !== 6) return LIA.showFormError(resetForm, 'Enter the 6-digit code from the email.');
  if (resetForm.newPassword.value !== resetForm.confirmPassword.value) return LIA.showFormError(resetForm, "The new passwords don't match.");
  try {
    const body = new FormData(resetForm);
    body.append('email', email);
    const data = await LIA.busy(resetForm.querySelector('button[type=submit]'), () => LIA.api('auth/reset_confirm.php', { body }));
    document.getElementById('toSignIn').href = `/index.html?as=${data.signInAs}&id=${encodeURIComponent(data.identifier)}`;
    show(3);
  } catch (err) {
    LIA.showFormError(resetForm, err.message);
    if (err.data?.codeExpired) document.getElementById('again').textContent = 'Send a new code';
  }
});

document.getElementById('again').addEventListener('click', () => { resetForm.reset(); LIA.showFormError(resetForm, ''); show(1); });
