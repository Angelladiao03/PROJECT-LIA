// Create a guest account: Terms -> Email -> Code -> Done.

const panels = [...document.querySelectorAll('[data-panel]')];
const dots = [...document.querySelectorAll('.wizard-steps li')];
let email = '';
let contactNumber = '';
let generatedPassword = null;

function goTo(step) {
  panels.forEach((p) => { p.hidden = Number(p.dataset.panel) !== step; });
  dots.forEach((d) => {
    const n = Number(d.dataset.step);
    d.className = n < step ? 'done' : n === step ? 'now' : '';
  });
  const focusTarget = panels[step - 1].querySelector('input, button');
  focusTarget?.focus();
}

// ---------- Step 1: Terms (must scroll to the end before agreeing) ----------
let termsHtml = null;
async function loadTerms() {
  if (termsHtml) return termsHtml;
  const res = await fetch('/terms.html');
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  termsHtml = doc.getElementById('terms').innerHTML;
  return termsHtml;
}

document.getElementById('openTerms').addEventListener('click', async () => {
  let html;
  try { html = await loadTerms(); }
  catch (e) { return LIA.toast("Couldn't load the terms. Check your connection.", 'error'); }

  LIA.openModal({
    title: 'Terms & Privacy Notice',
    wide: true,
    body: `
      <div class="terms-scroll terms-doc" id="termsScroll" tabindex="0">${html}</div>
      <p class="scroll-hint" id="scrollHint">Scroll to the end to continue.</p>
      <label class="check-row" style="margin-top:12px">
        <input type="checkbox" id="agreeBox" disabled>
        <span>I have read the Terms &amp; Privacy Notice and I agree to them, for my safety and privacy.</span>
      </label>`,
    foot: `<button class="btn btn-quiet" data-close>Cancel</button><button class="btn" id="agreeBtn" disabled>Continue</button>`,
    onOpen: (el, close) => {
      const box = el.querySelector('#termsScroll');
      const check = el.querySelector('#agreeBox');
      const hint = el.querySelector('#scrollHint');
      const btn = el.querySelector('#agreeBtn');
      const reachedEnd = () => box.scrollTop + box.clientHeight >= box.scrollHeight - 12;
      const update = () => {
        if (reachedEnd() && check.disabled) {
          check.disabled = false;
          hint.textContent = 'Thanks for reading. Check the box to agree.';
        }
      };
      box.addEventListener('scroll', update);
      update();
      check.addEventListener('change', () => { btn.disabled = !check.checked; });
      btn.addEventListener('click', () => { close(); goTo(2); });
    },
  });
});

// ---------- Step 2: Email ----------
const emailForm = document.getElementById('emailForm');
let resendTimer = null;

async function sendCode(button, form) {
  const data = await LIA.busy(button, () => LIA.api('guest/send_code.php', { body: { email, contactNumber, agree: 'yes' } }));
  document.getElementById('codeSentTo').innerHTML = `We sent a code to <b>${LIA.esc(email)}</b>. Check your inbox and spam folder. It works for 10 minutes.`;
  const dev = document.getElementById('devCode');
  dev.hidden = !data.devCode;
  if (data.devCode) dev.innerHTML = `Testing mode (no email service set up): your code is <b>${data.devCode}</b>`;
  startResendCountdown();
  return data;
}

function startResendCountdown() {
  const btn = document.getElementById('resend');
  let s = 60;
  btn.disabled = true;
  clearInterval(resendTimer);
  const tick = () => {
    btn.textContent = s > 0 ? `Send a new code (${s}s)` : 'Send a new code';
    if (s <= 0) { btn.disabled = false; clearInterval(resendTimer); }
    s--;
  };
  tick();
  resendTimer = setInterval(tick, 1000);
}

emailForm.contactNumber.addEventListener('input', () => {
  emailForm.contactNumber.value = emailForm.contactNumber.value.replace(/\D/g, '').slice(0, 11);
});

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  email = emailForm.email.value.trim().toLowerCase();
  contactNumber = emailForm.contactNumber.value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return LIA.showFormError(emailForm, 'Enter a valid email address, like name@gmail.com.');
  if (!/^09\d{9}$/.test(contactNumber)) return LIA.showFormError(emailForm, 'Enter your 11-digit phone number, starting with 09.');
  try {
    await sendCode(emailForm.querySelector('button[type=submit]'), emailForm);
    LIA.showFormError(emailForm, '');
    goTo(3);
  } catch (err) {
    LIA.showFormError(emailForm, err.message);
    // Email or phone already used: offer the way back in
    if (err.data?.hasAccount) {
      emailForm.querySelector('.form-error span').insertAdjacentHTML('beforeend',
        ` <a href="/index.html">Sign in</a> · <a href="/reset.html?email=${encodeURIComponent(email)}">Reset password</a>`);
    }
  }
});

// ---------- Step 3: Code ----------
const codeForm = document.getElementById('codeForm');
codeForm.code.addEventListener('input', () => {
  codeForm.code.value = codeForm.code.value.replace(/\D/g, '').slice(0, 6);
});

codeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = codeForm.code.value;
  if (code.length !== 6) return LIA.showFormError(codeForm, 'Enter the 6-digit code from the email.');
  try {
    const data = await LIA.busy(codeForm.querySelector('button[type=submit]'),
      () => LIA.api('guest/verify.php', { body: { email, code } }));
    generatedPassword = data.password;
    document.getElementById('newGuestId').textContent = data.guestId;
    document.getElementById('newPassword').textContent = data.password;
    document.getElementById('expiresNote').textContent =
      `Your guest account lasts until ${LIA.fmtDate(data.expiresAt)}. Your reports are kept even after that.`;
    goTo(4);
  } catch (err) {
    if (err.data?.restart) { LIA.toast(err.message, 'error'); return goTo(1); }
    LIA.showFormError(codeForm, err.message);
  }
});

document.getElementById('resend').addEventListener('click', async (e) => {
  try {
    await sendCode(e.currentTarget);
    LIA.toast('New code sent.');
  } catch (err) { LIA.showFormError(codeForm, err.message); }
});
document.getElementById('changeEmail').addEventListener('click', () => {
  codeForm.reset();
  LIA.showFormError(codeForm, '');
  goTo(2);
});

// ---------- Step 4: Done ----------
document.getElementById('copyId').addEventListener('click', () =>
  LIA.copyText(document.getElementById('newGuestId').textContent, 'Guest ID copied'));
document.getElementById('copyPw').addEventListener('click', () =>
  LIA.copyText(document.getElementById('newPassword').textContent, 'Password copied'));
document.getElementById('changePw').addEventListener('click', () => {
  LIA.changePasswordModal(generatedPassword, (newPassword) => {
    generatedPassword = newPassword;
    document.getElementById('newPassword').textContent = '•••••••• (changed)';
    document.getElementById('copyPw').hidden = true;
  });
});

goTo(1);
