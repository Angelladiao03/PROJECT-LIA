// Staff: the "REPORT CASE NO. #" details window (like the prototype), shared by
// Manage Reports, Report Records and Messages. It also holds the case actions:
// accept, start investigation, resolve, reject (with a reason), archive, restore.

const CASE = (() => {
  const reporterType = (r) => r.anonymous
    ? (r.reporter === null ? 'Anonymous' : 'Anonymous')
    : (r.reporter?.accountType === 'student' ? 'Identified student' : 'Guest');

  function reporterLabel(r) {
    if (r.anonymous) return '<span class="muted">Anonymous</span>';
    const p = r.reporter || {};
    return `<b>${LIA.esc(p.name)}</b>${p.gradeSection ? `<br><span class="small muted">${LIA.esc(p.gradeSection)}</span>` : ''}`;
  }

  // Which buttons each status gets
  function actionsFor(r) {
    const list = [];
    if (r.status === 'Pending') list.push(['approve', 'Accept report', '']);
    if (r.status === 'Active') list.push(['investigate', 'Start investigation', '']);
    if (r.status === 'Active' || r.status === 'Under Investigation') list.push(['resolve', 'Mark resolved', '']);
    if (r.status === 'Pending' || r.status === 'Active') list.push(['reject', 'Reject', 'btn-danger']);
    if ((r.status === 'Resolved' || r.status === 'Rejected') && !r.archived) list.push(['archive', 'Archive', 'btn-quiet']);
    if (r.archived) list.push(['unarchive', 'Restore to records', 'btn-quiet']);
    return list;
  }

  function askReason() {
    return new Promise((resolve) => {
      let done = false;
      LIA.openModal({
        title: 'Reject this report',
        body: `<form id="rejForm" novalidate><div class="field"><label for="reason">Reason the student will see</label>
               <textarea class="input" id="reason" maxlength="1000" placeholder="e.g. We need more details. Please message the guidance office so we can help."></textarea>
               <p class="hint">Be kind and clear. The student reads this in My Report History.</p></div></form>`,
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

  // Runs one action. Returns true if it worked.
  async function act(r, action, button) {
    const body = { action, reportNo: r.reportNo };
    if (action === 'reject') {
      const reason = await askReason();
      if (!reason) return false;
      body.reason = reason;
    }
    try {
      const run = () => LIA.api('admin/reports.php', { body });
      const res = button ? await LIA.busy(button, run) : await run();
      LIA.toast(res.message);
      return true;
    } catch (err) {
      LIA.toast(err.message, 'error');
      return false;
    }
  }

  // Opens the details window. onChange() runs after an action so the page can reload.
  function open(r, onChange) {
    const p = r.reporter || {};
    const row = (k, v) => `<dt>${LIA.esc(k)}:</dt><dd>${v ? LIA.esc(v) : '<span class="muted">-</span>'}</dd>`;
    const buttons = actionsFor(r).map(([a, label, cls]) => `<button class="btn ${cls}" data-act="${a}">${label}</button>`).join('');

    LIA.openModal({
      title: `Report Case No. #${r.reportNo}`,
      wide: true,
      className: 'case-modal',
      body: `
        <p style="margin:0 0 14px">${LIA.chip(r.status, 'staff')} ${r.archived ? '<span class="chip rejected">Archived</span>' : ''}</p>
        <div class="case-grid">
          <section class="case-section">
            <h3>Student Account Details</h3>
            ${r.anonymous
              ? `<p class="form-note" style="margin:0">The reporter chose to stay anonymous (or used a guest account). Their identity is hidden from staff.</p>`
              : `<dl class="case-facts">${row('Full Name', p.name)}${row('Account', p.accountType === 'student' ? 'Student' : 'Guest')}${row('Grade & Section', p.gradeSection)}${row('Username', p.username)}${row('Adviser', p.adviser)}${row('Email', p.email)}${row('Contact Number', p.contactNumber)}</dl>`}
          </section>
          <section class="case-section">
            <h3>Incident Report Details</h3>
            <dl class="case-facts">
              ${row('Category of Bullying', r.category)}
              ${row('Date of Incident', LIA.fmtDate(r.incidentDate))}
              ${row('Date & Time Filed', LIA.fmtDateTime(r.submittedAt))}
              ${row('Location', r.location)}
              ${row('Reporter is', LIA.ROLE[r.reporterRole])}
              ${row('Knows Person(s) Involved?', r.involvedKnown ? 'Yes' : 'No')}
            </dl>
          </section>
        </div>
        ${r.involvedKnown ? `<h3 style="margin-top:16px">Description of Person(s) Involved</h3><div class="quote-box">${LIA.esc(r.involvedDescription)}</div>` : ''}
        <h3 style="margin-top:16px">Description</h3>
        <div class="quote-box">${LIA.esc(r.description)}</div>
        ${r.status === 'Rejected' ? `<h3 style="margin-top:16px">Reason given to the student</h3><div class="reason">${LIA.esc(r.rejectReason)}</div>` : ''}`,
      foot: `${buttons}
        ${r.canMessage ? `<a class="btn btn-quiet" href="/admin/messages.html?userId=${p.userId}">Message</a>` : ''}
        <button class="btn btn-ghost" data-print>Print</button>
        <button class="btn btn-gray" data-close>Close</button>`,
      onOpen: (el, close) => {
        el.querySelector('[data-print]').addEventListener('click', () => {
          document.body.classList.add('printing-case');
          window.print();
          document.body.classList.remove('printing-case');
        });
        el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
          if (await act(r, b.dataset.act, b)) { close(); onChange?.(); }
        }));
      },
    });
  }

  return { open, act, actionsFor, reporterType, reporterLabel };
})();
