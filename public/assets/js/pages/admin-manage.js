// Staff: Manage Reports - new reports, active cases, and SOS alerts on one page.

(async () => {
  await LIA.start();
  let reports = [];
  let alerts = [];
  const search = document.getElementById('search');

  const summary = (text) => {
    const t = String(text || '');
    return LIA.esc(t.length > 90 ? t.slice(0, 90) + '...' : t);
  };
  const matches = (r) => {
    const q = search.value.trim().toLowerCase();
    if (!q) return true;
    return ['#' + r.reportNo, String(r.reportNo), r.category, r.location, r.description, r.reporter?.name, r.reporter?.gradeSection]
      .some((v) => String(v || '').toLowerCase().includes(q));
  };
  const emptyRow = (cols, text) => `<tr><td colspan="${cols}" class="empty-cell">${text}</td></tr>`;

  function draw() {
    // 1. New reports
    const fresh = reports.filter((r) => r.status === 'Pending').filter(matches);
    document.getElementById('nNew').textContent = reports.filter((r) => r.status === 'Pending').length;
    document.getElementById('newRows').innerHTML = fresh.length ? fresh.map((r) => `
      <tr>
        <td><b>#${r.reportNo}</b></td>
        <td>${LIA.esc(LIA.fmtDateTime(r.submittedAt))}</td>
        <td>${LIA.esc(CASE.reporterType(r))}</td>
        <td>${LIA.esc(r.category)}</td>
        <td class="summary">${summary(r.description)}</td>
        <td class="actions">
          <button class="btn btn-quiet btn-sm" data-view="${r.reportNo}">View Details</button>
          <button class="btn btn-sm" data-act="approve" data-no="${r.reportNo}">Accept</button>
          <button class="btn btn-danger btn-sm" data-act="reject" data-no="${r.reportNo}">Reject</button>
        </td>
      </tr>`).join('') : emptyRow(6, 'No new reports to review.');

    // 2. Active cases
    const active = reports.filter((r) => r.status === 'Active' || r.status === 'Under Investigation').filter(matches);
    document.getElementById('nActive').textContent = reports.filter((r) => r.status === 'Active' || r.status === 'Under Investigation').length;
    document.getElementById('activeRows').innerHTML = active.length ? active.map((r) => `
      <tr>
        <td><b>#${r.reportNo}</b></td>
        <td>${CASE.reporterLabel(r)}</td>
        <td>${LIA.esc(r.category)}</td>
        <td>${LIA.chip(r.status, 'staff')}</td>
        <td class="actions"><div class="row-actions">
          <select class="input input-sm" data-update="${r.reportNo}" aria-label="New status for report ${r.reportNo}">
            <option value="">Update status...</option>
            ${r.status === 'Active' ? '<option value="investigate">Under investigation</option>' : ''}
            <option value="resolve">Resolved</option>
            ${r.status === 'Active' ? '<option value="reject">Rejected</option>' : ''}
          </select>
          <button class="btn btn-sm" data-apply="${r.reportNo}">Update</button>
          <button class="btn btn-quiet btn-sm" data-view="${r.reportNo}">View Details</button>
        </div></td>
      </tr>`).join('') : emptyRow(5, 'No active cases.');

    // 3. SOS: waiting alerts first, then the 15 most recent handled ones
    const open = alerts.filter((a) => a.status !== 'Responded');
    const done = alerts.filter((a) => a.status === 'Responded').slice(0, 15);
    document.getElementById('nSos').textContent = alerts.filter((a) => a.status === 'Active').length;
    document.getElementById('sosRows').innerHTML = (open.length || done.length) ? [...open, ...done].map((a) => `
      <tr class="${a.status === 'Active' ? 'sos-active' : ''}">
        <td>${LIA.esc(LIA.fmtDateTime(a.sentAt))}<br><span class="small muted">${LIA.esc(LIA.timeAgo(a.sentAt))}</span></td>
        <td><b>${LIA.esc(a.name)}</b>${a.gradeSection ? `<br><span class="small muted">${LIA.esc(a.gradeSection)}</span>` : ''}${a.contactNumber ? `<br><a class="small" href="tel:${LIA.esc(a.contactNumber)}">${LIA.esc(a.contactNumber)}</a>` : ''}</td>
        <td>${LIA.esc(a.location)}</td>
        <td class="summary">${LIA.esc(a.description)}</td>
        <td><span class="chip ${a.status === 'Active' ? 'sos' : a.status === 'Dispatched' ? 'active' : 'resolved'}">${LIA.esc(a.status)}</span></td>
        <td class="actions">
          ${a.status === 'Active' ? `<button class="btn btn-sos btn-sm" data-sos="dispatch" data-id="${a.sosNo}">Dispatch</button>` : ''}
          ${a.status !== 'Responded' ? `<button class="btn btn-quiet btn-sm" data-sos="respond" data-id="${a.sosNo}">Mark responded</button>` : ''}
          ${a.userId ? `<a class="btn btn-ghost btn-sm" href="/admin/messages.html?userId=${a.userId}">Message</a>` : ''}
        </td>
      </tr>`).join('') : emptyRow(6, 'No SOS alerts.');
  }

  async function load() {
    try {
      [{ reports }, { alerts }] = await Promise.all([LIA.api('admin/reports.php'), LIA.api('admin/sos.php')]);
      draw();
    } catch (e) { LIA.toast(e.message, 'error'); }
  }

  document.querySelector('main').addEventListener('click', async (e) => {
    const view = e.target.closest('[data-view]');
    if (view) return CASE.open(reports.find((r) => r.reportNo === Number(view.dataset.view)), load);

    const quick = e.target.closest('[data-act]');
    if (quick) {
      const r = reports.find((x) => x.reportNo === Number(quick.dataset.no));
      if (r && await CASE.act(r, quick.dataset.act, quick)) load();
      return;
    }

    const apply = e.target.closest('[data-apply]');
    if (apply) {
      const select = document.querySelector(`[data-update="${apply.dataset.apply}"]`);
      if (!select.value) return LIA.toast('Choose the new status first.', 'error');
      const r = reports.find((x) => x.reportNo === Number(apply.dataset.apply));
      if (r && await CASE.act(r, select.value, apply)) load();
      return;
    }

    const sos = e.target.closest('[data-sos]');
    if (sos) {
      try {
        const res = await LIA.busy(sos, () => LIA.api('admin/sos.php', { body: { action: sos.dataset.sos, sosNo: sos.dataset.id } }));
        LIA.toast(res.message);
      } catch (err) { LIA.toast(err.message, 'error'); }
      load();
    }
  });

  document.getElementById('testSound').addEventListener('click', () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 880;
    const g = ctx.createGain(); g.gain.value = 0.2; o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.3);
    LIA.toast('If you heard a beep, SOS alerts will make a sound on this device.');
  });

  search.addEventListener('input', draw);
  document.addEventListener('lia:new-sos', load);
  await load();
  if (location.hash === '#sos') document.getElementById('sos').scrollIntoView({ behavior: 'smooth' });
  setInterval(load, 20000);
})();
