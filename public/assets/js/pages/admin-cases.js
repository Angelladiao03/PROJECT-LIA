// Staff: Cases (New / Active / Under investigation) and Records (Resolved / Rejected / Archived).
// The page sets <body data-mode="cases"> or <body data-mode="records">.

const MODE = document.body.dataset.mode;
const TABS = MODE === 'cases'
  ? [
      { id: 'new', label: 'New', test: (r) => r.status === 'Pending' },
      { id: 'active', label: 'Active', test: (r) => r.status === 'Active' },
      { id: 'investigating', label: 'Under investigation', test: (r) => r.status === 'Under Investigation' },
    ]
  : [
      { id: 'resolved', label: 'Resolved', test: (r) => r.status === 'Resolved' && !r.archived },
      { id: 'rejected', label: 'Rejected', test: (r) => r.status === 'Rejected' && !r.archived },
      { id: 'archived', label: 'Archived', test: (r) => r.archived },
    ];

let reports = [];
let tab = TABS.find((t) => '#' + t.id === location.hash)?.id || TABS[0].id;
const listEl = document.getElementById('list');
const tabsEl = document.getElementById('tabs');
const searchEl = document.getElementById('search');

async function load() {
  try {
    ({ reports } = await LIA.api('admin/reports.php'));
    render();
  } catch (e) {
    listEl.innerHTML = `<div class="empty"><strong>Couldn't load reports</strong><span>${LIA.esc(e.message)}</span></div>`;
  }
}

function render() {
  tabsEl.innerHTML = TABS.map((t) => `<button class="tab" role="tab" aria-selected="${t.id === tab}" data-tab="${t.id}">${t.label} <span class="n">${reports.filter(t.test).length}</span></button>`).join('');
  const q = searchEl.value.trim().toLowerCase();
  const rows = reports.filter(TABS.find((t) => t.id === tab).test).filter((r) => !q || [
    '#' + r.reportNo, r.category, r.location, r.description, r.reporter?.name, r.reporter?.gradeSection,
  ].some((v) => String(v || '').toLowerCase().includes(q)));

  if (!rows.length) {
    listEl.innerHTML = `<div class="empty"><strong>${q ? 'No matches' : 'Nothing here'}</strong><span>${q ? 'Try a different search.' : MODE === 'cases' ? 'New reports will show up here.' : 'Finished reports will show up here.'}</span></div>`;
    return;
  }
  listEl.innerHTML = rows.map((r) => `
    <button class="row-card" data-open="${r.reportNo}">
      <span class="row-top"><strong>#${r.reportNo} · ${LIA.esc(r.category)}</strong>${LIA.chip(r.status, 'staff')}</span>
      <span class="row-meta">
        <span>${r.anonymous ? 'Name hidden' : LIA.esc(r.reporter?.name || '')}</span>
        <span>${LIA.esc(LIA.ROLE[r.reporterRole] || '')}</span>
        <span>${LIA.esc(r.location)}</span>
        <span>Sent ${LIA.esc(LIA.timeAgo(r.submittedAt))}</span>
      </span>
      <span class="row-text">${LIA.esc(r.description)}</span>
    </button>`).join('');
}

tabsEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  history.replaceState(null, '', '#' + tab);
  render();
});
searchEl.addEventListener('input', render);
listEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) openCase(Number(b.dataset.open));
});

// ---------- Case side panel ----------
function openCase(reportNo) {
  const r = reports.find((x) => x.reportNo === reportNo);
  if (!r) return;
  document.querySelector('.drawer')?.remove();
  const p = r.reporter;
  const fact = (k, v) => v ? `<dt>${LIA.esc(k)}</dt><dd>${LIA.esc(v)}</dd>` : '';

  const actions = [];
  if (r.status === 'Pending') actions.push(['approve', 'Accept case', '']);
  if (r.status === 'Active') actions.push(['investigate', 'Start investigation', '']);
  if (r.status === 'Active' || r.status === 'Under Investigation') actions.push(['resolve', 'Mark resolved', '']);
  if (r.status === 'Pending' || r.status === 'Active') actions.push(['reject', 'Reject', 'btn-danger']);
  if ((r.status === 'Resolved' || r.status === 'Rejected') && !r.archived) actions.push(['archive', 'Archive', 'btn-quiet']);
  if (r.archived) actions.push(['unarchive', 'Restore to records', 'btn-quiet']);

  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', `Report ${r.reportNo}`);
  drawer.innerHTML = `
    <div class="drawer-head">
      <h2>Report #${r.reportNo}</h2>${LIA.chip(r.status, 'staff')}
      <button class="icon-btn" data-x aria-label="Close">${LIA.icon('x')}</button>
    </div>
    <div class="drawer-body">
      <h3>The report</h3>
      <dl class="facts">
        ${fact('Kind', r.category)}${fact('Where', r.location)}${fact('When it happened', LIA.fmtDate(r.incidentDate))}
        ${fact('Sent', LIA.fmtDateTime(r.submittedAt))}${fact('Reporter is', LIA.ROLE[r.reporterRole])}
        ${r.archived ? fact('Archived', 'Yes (kept, hidden from main list)') : ''}
      </dl>
      <div class="quote-box">${LIA.esc(r.description)}</div>
      ${r.involvedKnown ? `<h3 style="margin-top:18px">People involved</h3><div class="quote-box">${LIA.esc(r.involvedDescription)}</div>` : ''}
      ${r.status === 'Rejected' ? `<h3 style="margin-top:18px">Reason given to the student</h3><div class="reason">${LIA.esc(r.rejectReason)}</div>` : ''}

      <h3 style="margin-top:22px">Who sent it</h3>
      ${r.anonymous
        ? `<p class="form-note">The student chose to hide their name, or sent it from a guest account. Their identity is not shown to staff.</p>`
        : `<dl class="facts">${fact('Name', p.name)}${fact('Account', p.accountType === 'student' ? 'Student' : 'Guest')}${fact('Grade and section', p.gradeSection)}${fact('Adviser', p.adviser)}${fact('Contact number', p.contactNumber)}${fact('Email', p.email)}</dl>`}
    </div>
    <div class="drawer-foot">
      ${actions.map(([a, label, cls]) => `<button class="btn ${cls}" data-act="${a}">${label}</button>`).join('')}
      ${r.canMessage ? `<a class="btn btn-quiet" href="/admin/messages.html?userId=${p.userId}">${LIA.icon('chat')} Message</a>` : ''}
      <button class="btn btn-ghost" data-print>Print</button>
    </div>`;
  document.body.append(drawer);
  drawer.querySelector('[data-x]').focus();

  const close = () => { drawer.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  drawer.querySelector('[data-x]').addEventListener('click', close);
  drawer.querySelector('[data-print]').addEventListener('click', () => {
    document.body.classList.add('printing-case');
    window.print();
    document.body.classList.remove('printing-case');
  });

  drawer.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', async () => {
    const action = btn.dataset.act;
    const body = { action, reportNo: r.reportNo };
    if (action === 'reject') {
      const reason = await askReason();
      if (!reason) return;
      body.reason = reason;
    }
    try {
      const res = await LIA.busy(btn, () => LIA.api('admin/reports.php', { body }));
      LIA.toast(res.message);
      close();
      await load();
    } catch (err) { LIA.toast(err.message, 'error'); }
  }));
}

function askReason() {
  return new Promise((resolve) => {
    let done = false;
    LIA.openModal({
      title: 'Reject this report',
      body: `<form id="rejForm" novalidate><div class="field"><label for="reason">Reason the student will see</label>
             <textarea class="input" id="reason" maxlength="1000" placeholder="e.g. We need more details. Please message the guidance office so we can help."></textarea>
             <p class="hint">Be kind and clear. The student reads this in My reports.</p></div></form>`,
      foot: `<button class="btn btn-quiet" data-close>Cancel</button><button class="btn btn-sos" form="rejForm" type="submit">Reject report</button>`,
      onOpen: (el, close) => {
        el.querySelector('#rejForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const v = el.querySelector('#reason').value.trim();
          if (v.length < 5) return LIA.showFormError(e.target, 'Write a short reason (at least 5 characters).');
          done = true; close(); resolve(v);
        });
        new MutationObserver((_, obs) => { if (!el.isConnected) { obs.disconnect(); if (!done) resolve(null); } })
          .observe(document.body, { childList: true });
      },
    });
  });
}

(async () => {
  await LIA.start();
  await load();
  setInterval(load, 30000);
})();
