// Account page: details, change password, and the request to become a
// permanent student account (with a school ID photo).

(async () => {
  const me = await LIA.start();
  const a = me.account;
  const isGuest = a.accountType === 'guest';

  // ---------- Header ----------
  const big = document.getElementById('bigAvatar');
  big.textContent = LIA.initials(isGuest ? 'Guest' : a.fullName);
  big.classList.toggle('guest', isGuest);
  document.getElementById('who').textContent = isGuest ? 'Guest ' + a.guestId : a.fullName;
  document.getElementById('whoSub').textContent = isGuest ? 'Guest account' : 'Student account · @' + a.username;
  const pwBtn = document.getElementById('changePw');
  pwBtn.innerHTML = LIA.icon('key') + 'Change password';
  pwBtn.addEventListener('click', () => LIA.changePasswordModal());

  const fact = (k, v) => v ? `<dt>${LIA.esc(k)}</dt><dd>${LIA.esc(v)}</dd>` : '';
  document.getElementById('facts').innerHTML = isGuest
    ? fact('Guest ID', a.guestId) + fact('Email', a.email) + fact('Created', LIA.fmtDate(a.createdAt))
      + fact('Expires', a.expiresAt ? `${LIA.fmtDate(a.expiresAt)} (kept open while a report or request is being handled)` : '')
    : fact('Username', a.username) + fact('Email', a.email) + fact('Grade and section', a.gradeSection)
      + fact('Adviser', a.adviser) + fact('Contact number', a.contactNumber) + fact('Guest ID', a.guestId);

  // ---------- Permanent account ----------
  const box = document.getElementById('activate');
  const req = me.activation;

  if (!isGuest) {
    box.innerHTML = `<h2>Permanent student account</h2><p style="margin:0">Your account is permanent and doesn't expire. To change your details, message the guidance office.</p>`;
    return;
  }
  if (req && req.status === 'Pending') {
    box.innerHTML = `
      <div class="card-title"><h2>Request sent</h2><span class="chip pending">Being reviewed</span></div>
      <p>You asked on ${LIA.esc(LIA.fmtDate(req.submittedAt))} to make this a permanent student account. The guidance office will email you the result.</p>
      <p class="small muted" style="margin:0">Your guest account stays open while you wait, and you can keep sending reports.</p>`;
    return;
  }

  const declined = req && req.status === 'Declined';
  box.innerHTML = `
    <h2>Make your account permanent</h2>
    <p>A permanent student account doesn't expire, and you can choose to show your name on reports so staff can follow up with you. The guidance office checks your school ID before approving.</p>
    ${declined ? `<div class="reason" style="margin-bottom:16px"><b>Your last request wasn't approved:</b> ${LIA.esc(req.declineReason)}<br><span class="small muted">Fix the issue and send a new request.</span></div>` : ''}
    <form id="actForm" novalidate>
      <div class="field"><label for="fullName">Full name</label><input class="input" id="fullName" name="fullName" maxlength="150" autocomplete="name" required></div>
      <div class="field">
        <label for="username">Choose a username</label>
        <input class="input" id="username" name="username" maxlength="24" autocomplete="username" required>
        <p class="hint">8 to 24 letters, numbers, dots or underscores. You'll sign in with this or your email.</p>
      </div>
      <div class="field"><label for="gradeSection">Grade and section</label><input class="input" id="gradeSection" name="gradeSection" maxlength="50" placeholder="e.g. 10 - Sampaguita" required></div>
      <div class="field"><label for="adviser">Adviser's name</label><input class="input" id="adviser" name="adviser" maxlength="150" required></div>
      <div class="field"><label for="contactNumber">Contact number</label><input class="input" id="contactNumber" name="contactNumber" inputmode="numeric" maxlength="11" placeholder="09XXXXXXXXX" required style="max-width:240px"></div>

      <div class="field">
        <span class="label">Photo of your school ID</span>
        <label class="choice" for="idPhoto" style="align-items:center">
          ${LIA.icon('image')}
          <span><strong id="photoName">Choose a photo</strong><span>JPG or PNG. Take a clear photo of the front of your ID.</span></span>
        </label>
        <input class="visually-hidden" id="idPhoto" name="idPhoto" type="file" accept="image/jpeg,image/png,image/webp">
        <img id="photoPreview" alt="Preview of your ID photo" hidden style="max-height:180px;border-radius:10px;border:1px solid var(--line);width:auto">
      </div>

      <div class="form-note small" style="margin-bottom:16px">
        <b>How we protect your ID photo:</b> only guidance staff can see it, only to check that you are a Lagro High School student. It is <b>deleted as soon as they approve or decline</b> your request.
      </div>
      <label class="check-row" style="margin-bottom:20px">
        <input type="checkbox" id="consent">
        <span>I agree that the guidance office may view my ID photo to check my account, as explained above and in the <a href="/terms.html" target="_blank">Terms &amp; privacy</a>.</span>
      </label>
      <div style="display:flex;justify-content:flex-end"><button class="btn btn-big" type="submit">Send request</button></div>
    </form>`;

  const form = document.getElementById('actForm');
  const fileInput = document.getElementById('idPhoto');
  const preview = document.getElementById('photoPreview');
  let photoBlob = null;

  form.contactNumber.addEventListener('input', () => { form.contactNumber.value = form.contactNumber.value.replace(/\D/g, '').slice(0, 11); });

  // Phone photos are big. Shrink the photo in the browser before uploading
  // (max 1600px wide, JPEG), so it uploads fast and stays under 3 MB.
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    photoBlob = null;
    preview.hidden = true;
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return LIA.showFormError(form, 'Choose a JPG or PNG photo.');
    }
    try {
      photoBlob = await shrinkImage(file, 1600);
      preview.src = URL.createObjectURL(photoBlob);
      preview.hidden = false;
      document.getElementById('photoName').textContent = file.name;
      LIA.showFormError(form, '');
    } catch (e) {
      LIA.showFormError(form, "That photo couldn't be opened. Try another one.");
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = (n) => form[n].value.trim();
    let problem = null;
    if (!val('fullName')) problem = 'Enter your full name.';
    else if (!/^[A-Za-z0-9._]{8,24}$/.test(val('username'))) problem = 'Username must be 8 to 24 letters, numbers, dots or underscores.';
    else if (!val('gradeSection')) problem = 'Enter your grade and section.';
    else if (!val('adviser')) problem = "Enter your adviser's name.";
    else if (!/^09\d{9}$/.test(val('contactNumber'))) problem = 'Contact number must be 11 digits and start with 09.';
    else if (!photoBlob) problem = 'Add a photo of your school ID.';
    else if (!document.getElementById('consent').checked) problem = 'Check the box to agree to the ID photo being reviewed.';
    if (problem) return LIA.showFormError(form, problem);

    const fd = new FormData(form);
    fd.set('idPhoto', photoBlob, 'id-photo.jpg');
    fd.set('consent', 'yes');
    try {
      await LIA.busy(form.querySelector('button[type=submit]'), () => LIA.api('account/activation.php', { body: fd }));
      LIA.toast('Request sent.');
      setTimeout(() => location.reload(), 900);
    } catch (err) { LIA.showFormError(form, err.message); }
  });

  if (location.hash === '#activate') box.scrollIntoView({ behavior: 'smooth' });
})();

function shrinkImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no blob'))), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
