// My Account: profile (Edit Profile, Change Password, Log Out), request for a
// permanent student account (guests), and My Report History.

(async () => {
  const me = await LIA.start();
  let a = me.account;
  const isGuest = a.accountType === 'guest';

  // ---------- Profile card ----------
  function drawProfile() {
    const big = document.getElementById('bigAvatar');
    big.textContent = LIA.initials(isGuest ? 'Guest' : a.fullName);
    big.classList.toggle('guest', isGuest);
    document.getElementById('who').textContent = isGuest ? 'Guest ' + a.guestId : a.fullName;
    document.getElementById('whoType').textContent = isGuest ? 'Guest account' : 'Student account';
    const fact = (k, v) => v ? `<dt>${LIA.esc(k)}:</dt><dd>${LIA.esc(v)}</dd>` : '';
    document.getElementById('facts').innerHTML = isGuest
      ? fact('Guest ID', a.guestId) + fact('Gmail', a.email) + fact('Created', LIA.fmtDate(a.createdAt))
        + fact('Expires', a.expiresAt ? `${LIA.fmtDate(a.expiresAt)} (kept open while a report or request is being handled)` : '')
      : fact('Username', a.username) + fact('Grade & Section', a.gradeSection) + fact('Adviser', a.adviser)
        + fact('Gmail', a.email) + fact('Contact Number', a.contactNumber) + fact('Guest ID', a.guestId);
  }
  drawProfile();

  document.getElementById('changePw').addEventListener('click', () => LIA.changePasswordModal());
  document.getElementById('logOut').addEventListener('click', async () => {
    const ok = await LIA.confirmBox({ title: 'Log out', text: 'Do you want to log out?', confirmLabel: 'Log out' });
    if (!ok) return;
    try { await LIA.api('auth/logout.php', { body: {} }); } catch (e) { /* leaving anyway */ }
    location.href = '/index.html';
  });

  document.querySelectorAll('.stat-icon[data-icon]').forEach((el) => { el.innerHTML = LIA.icon(el.dataset.icon); });

  // Edit Profile (permanent student accounts)
  const editBtn = document.getElementById('editProfile');
  editBtn.hidden = isGuest;
  editBtn.addEventListener('click', () => {
    LIA.openModal({
      title: 'Edit Profile',
      body: `
        <form id="profileForm" novalidate>
          <div class="field"><label for="pUsername">Username</label><input class="input" id="pUsername" name="username" maxlength="24" value="${LIA.esc(a.username)}"></div>
          <div class="field"><label for="pGrade">Grade &amp; Section</label><input class="input" id="pGrade" name="gradeSection" maxlength="50" value="${LIA.esc(a.gradeSection)}"></div>
          <div class="field"><label for="pAdviser">Adviser</label><input class="input" id="pAdviser" name="adviser" maxlength="150" value="${LIA.esc(a.adviser)}"></div>
          <div class="field"><label for="pContact">Contact Number</label><input class="input" id="pContact" name="contactNumber" inputmode="numeric" maxlength="11" value="${LIA.esc(a.contactNumber)}"></div>
          <p class="small muted" style="margin:0">To change your full name or email, message the guidance office.</p>
        </form>`,
      foot: `<button class="btn btn-quiet" data-close>Cancel</button><button class="btn" form="profileForm" type="submit">Save changes</button>`,
      onOpen: (el, close) => {
        const form = el.querySelector('#profileForm');
        form.contactNumber.addEventListener('input', () => { form.contactNumber.value = form.contactNumber.value.replace(/\D/g, '').slice(0, 11); });
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const res = await LIA.busy(el.querySelector('button[type=submit]'), () => LIA.api('account/profile.php', { body: new FormData(form) }));
            a = res.account;
            drawProfile();
            close();
            LIA.toast('Profile updated.');
          } catch (err) { LIA.showFormError(form, err.message); }
        });
      },
    });
  });

  // ---------- Guests: request a permanent student account ----------
  if (isGuest) drawActivation(me.activation);

  // ---------- My Report History ----------
  let reports = [];
  let filter = 'all';
  const rows = document.getElementById('rows');
  const tabs = document.getElementById('filterTabs');

  function drawReports() {
    // Counter cards: the number, plus what share of all your reports it is
    const count = (s) => reports.filter((r) => r.status === s).length;
    [['Pending', 'Pending'], ['Active', 'Active'], ['Under Investigation', 'Invest'], ['Resolved', 'Resolved']].forEach(([status, id]) => {
      const n = count(status);
      const pct = reports.length ? Math.round((n / reports.length) * 100) : 0;
      document.getElementById('c' + id).textContent = n;
      document.getElementById('s' + id).innerHTML = `<b>${pct}%</b> of your ${reports.length} report${reports.length === 1 ? '' : 's'}`;
    });
    document.querySelectorAll('.stat-card').forEach((c) => {
      c.classList.toggle('selected', c.dataset.filter === filter);
      c.setAttribute('aria-pressed', String(c.dataset.filter === filter));
    });

    const list = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
    if (!list.length) {
      rows.innerHTML = `<tr><td colspan="7"><div class="empty" style="border:0;background:none"><strong>${reports.length ? 'No reports here' : 'No reports yet'}</strong><span>${reports.length ? 'Choose another filter.' : 'Reports you submit will appear here.'}</span></div></td></tr>`;
      return;
    }
    rows.innerHTML = list.map((r) => `
      <tr class="clickable" data-open="${r.reportNo}" tabindex="0">
        <td><b>#${r.reportNo}</b></td>
        <td>${LIA.esc(r.category)}</td>
        <td>${LIA.esc(r.location)}</td>
        <td>${r.anonymous ? '<span class="muted">Anonymous</span>' : LIA.esc(a.fullName || 'You')}</td>
        <td>${LIA.esc(LIA.fmtDateTime(r.submittedAt))}</td>
        <td>${LIA.chip(r.status)}</td>
        <td><button class="btn btn-ghost btn-sm" type="button" data-open="${r.reportNo}">View</button></td>
      </tr>`).join('');
  }

  function openReport(no) {
    const r = reports.find((x) => x.reportNo === no);
    if (!r) return;
    const STEPS = ['Sent', 'Accepted', 'Investigating', 'Resolved'];
    const reached = { 'Pending': 1, 'Active': 2, 'Under Investigation': 3, 'Resolved': 4, 'Rejected': 1 };
    LIA.openModal({
      title: `Report #${r.reportNo}`,
      wide: true,
      body: `
        <p style="margin:0 0 12px">${LIA.chip(r.status)}</p>
        ${r.status === 'Rejected'
          ? `<div class="reason" style="margin-bottom:16px"><b>Why it wasn't accepted:</b> ${LIA.esc(r.rejectReason || 'No reason given.')}<br><span class="small muted">You can submit a new report or message the guidance office.</span></div>`
          : `<ol class="steps" style="margin-bottom:20px">${STEPS.map((s, i) => `<li class="${i < reached[r.status] ? 'done' : ''}">${s}</li>`).join('')}</ol>`}
        <dl class="facts">
          <dt>Category</dt><dd>${LIA.esc(r.category)}</dd>
          <dt>Location</dt><dd>${LIA.esc(r.location)}</dd>
          <dt>Date of incident</dt><dd>${LIA.esc(LIA.fmtDate(r.incidentDate))}</dd>
          <dt>Filed</dt><dd>${LIA.esc(LIA.fmtDateTime(r.submittedAt))}</dd>
          <dt>You are</dt><dd>${LIA.esc(LIA.ROLE[r.reporterRole] || '')}</dd>
          <dt>Name shown to staff</dt><dd>${r.anonymous ? 'No (anonymous)' : 'Yes'}</dd>
        </dl>
        <div class="quote-box">${LIA.esc(r.description)}</div>`,
      foot: `<a class="btn btn-quiet" href="/app/messages.html">Message the guidance office</a><button class="btn" data-close>Close</button>`,
    });
  }

  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('[data-filter]');
    if (t) { filter = t.dataset.filter; drawReports(); }
  });
  document.getElementById('stats').addEventListener('click', (e) => {
    const c = e.target.closest('[data-filter]');
    if (c) { filter = filter === c.dataset.filter ? 'all' : c.dataset.filter; drawReports(); }
  });
  rows.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (t) openReport(Number(t.dataset.open));
  });
  rows.addEventListener('keydown', (e) => {
    const t = e.target.closest('tr[data-open]');
    if (t && e.key === 'Enter') openReport(Number(t.dataset.open));
  });

  try {
    ({ reports } = await LIA.api('reports/mine.php'));
    drawReports();
  } catch (e) {
    rows.innerHTML = `<tr><td colspan="7" class="muted">${LIA.esc(e.message)}</td></tr>`;
  }
  if (location.hash === '#history') document.getElementById('history').scrollIntoView();
  if (location.hash === '#activate') document.getElementById('activate').scrollIntoView();
})();

// ---------- Request a permanent student account (guests only) ----------
function drawActivation(req) {
  const box = document.getElementById('activate');
  box.hidden = false;

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
    <p>A permanent student account doesn't expire, and you can choose to include your identity on reports so staff can follow up with you. The guidance office checks your school ID before approving.</p>
    ${declined ? `<div class="reason" style="margin-bottom:16px"><b>Your last request wasn't approved:</b> ${LIA.esc(req.declineReason)}<br><span class="small muted">Fix the issue and send a new request.</span></div>` : ''}
    <form id="actForm" novalidate>
      <div class="form-row">
        <div class="field"><label for="fullName">Full Name</label><input class="input" id="fullName" name="fullName" maxlength="150" autocomplete="name"></div>
        <div class="field"><label for="username">Username</label><input class="input" id="username" name="username" maxlength="24" autocomplete="username"><p class="hint">8 to 24 letters, numbers, dots or underscores.</p></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="gradeSection">Grade &amp; Section</label><input class="input" id="gradeSection" name="gradeSection" maxlength="50" placeholder="e.g. 10 - Sampaguita"></div>
        <div class="field"><label for="adviser">Adviser</label><input class="input" id="adviser" name="adviser" maxlength="150"></div>
      </div>
      <div class="field" style="max-width:300px"><label for="contactNumber">Contact Number</label><input class="input" id="contactNumber" name="contactNumber" inputmode="numeric" maxlength="11" placeholder="09XXXXXXXXX"></div>
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

  // Phone photos are big: shrink in the browser first (max 1600px, JPEG) so it uploads fast.
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    photoBlob = null;
    preview.hidden = true;
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return LIA.showFormError(form, 'Choose a JPG or PNG photo.');
    try {
      photoBlob = await shrinkImage(file, 1600);
      preview.src = URL.createObjectURL(photoBlob);
      preview.hidden = false;
      document.getElementById('photoName').textContent = file.name;
      LIA.showFormError(form, '');
    } catch (e) { LIA.showFormError(form, "That photo couldn't be opened. Try another one."); }
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
}

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
