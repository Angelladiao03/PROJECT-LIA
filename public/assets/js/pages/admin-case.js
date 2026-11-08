// Staff: the "REPORT CASE NO. #" details window (like the prototype), shared by
// Manage Reports, Report Records and Messages. It also holds the case actions:
// accept, start investigation, for intervention, for referral (asks where), resolve, reject (with a reason),
// archive, restore. Print / Save as PDF only show once a report is accepted (not while it waits for approval).
// The student's personal details only show after the staff member types their password (showStudent).

const CASE = (() => {
  const reporterType = (r) => (r.anonymous ? 'Anonymous' : r.reporter?.accountType === 'student' ? 'Identified student' : 'Guest');
  const gradeText = (r) => (r.gradeLevel ? 'Grade ' + r.gradeLevel : 'Grade not given');

  function reporterLabel(r) {
    const who = r.anonymous ? '<span class="muted">Anonymous</span>' : `<b>${LIA.esc(r.reporter?.name)}</b>`;
    return `${who}<br><span class="small muted">${gradeText(r)}</span>`;
  }

  // ---------- Student details, behind the staff member's password ----------
  // who = { report: N } (the reporter of report N) or { user: N } (a general chat)
  // Returns the details, or null if the staff member cancelled.
  async function studentDetails(who) {
    const url = 'admin/student.php?' + (who.report ? 'report=' + who.report : 'user=' + who.user);
    try { return (await LIA.api(url)).student; } catch (err) {
      if (!err.data?.locked) { LIA.toast(err.message, 'error'); return null; }
    }
    const unlocked = await new Promise((resolve) => {
      let done = false;
      LIA.openModal({
        title: 'Enter your password',
        body: `<form id="unlockForm" novalidate>
            <p>Student details are private. Type your own password to see them. They stay open for 10 minutes, and each view is recorded under your name.</p>
            <div class="field"><label for="unlockPw">Your password</label>
              <div class="pw-wrap"><input class="input" id="unlockPw" type="password" autocomplete="current-password"><button class="icon-btn pw-toggle" data-pw-toggle></button></div></div>
          </form>`,
        foot: '<button class="btn btn-quiet" data-close>Cancel</button><button class="btn" form="unlockForm" type="submit">Show details</button>',
        onOpen: (el, close) => {
          LIA.wirePasswordToggles(el);
          el.querySelector('#unlockForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
              await LIA.busy(el.querySelector('[form=unlockForm]'), () => LIA.api('admin/student.php', { body: { action: 'unlock', password: el.querySelector('#unlockPw').value } }));
              done = true; close(); resolve(true);
            } catch (err) { LIA.showFormError(e.target, err.message); }
          });
          new MutationObserver((_, obs) => { if (!el.isConnected) { obs.disconnect(); if (!done) resolve(false); } })
            .observe(document.body, { childList: true });
        },
      });
    });
    if (!unlocked) return null;
    try { return (await LIA.api(url)).student; } catch (err) { LIA.toast(err.message, 'error'); return null; }
  }

  const row = (k, v) => `<dt>${LIA.esc(k)}:</dt><dd>${v ? LIA.esc(v) : '<span class="muted">-</span>'}</dd>`;
  function studentFacts(s) {
    if (s.anonymous) return `<p class="form-note" style="margin:0 0 10px">The reporter chose to stay anonymous (or used a guest account). Their identity stays hidden. Only their contact number is shown.</p>
      <dl class="case-facts">${row('Contact Number', s.contactNumber)}</dl>`;
    return `<dl class="case-facts">${row('Full Name', s.name)}${row('Account', s.accountType === 'student' ? 'Student' : 'Guest (anonymous)')}${row('Grade & Section', s.gradeSection)}
      ${row('Username', s.username)}${row('Adviser', s.adviser)}${row('Email', s.email)}${row('Contact Number', s.contactNumber)}</dl>
      ${s.expired ? '<p class="small muted" style="margin:8px 0 0">This guest account has expired.</p>' : ''}`;
  }
  // "View Info" in Messages: the details in their own window
  async function showStudent(who) {
    const s = await studentDetails(who);
    if (s) LIA.openModal({ title: s.anonymous ? 'Reporter contact' : 'Student Information', body: studentFacts(s), foot: '<button class="btn btn-gray" data-close>Close</button>' });
  }

  // Which buttons each status gets
  function actionsFor(r) {
    const list = [];
    if (r.status === 'Pending') list.push(['approve', 'Accept report', '']);
    if (r.status === 'Active') list.push(['investigate', 'Start investigation', '']);
    const handling = ['Active', 'Under Investigation', 'For Intervention', 'For Referral'].includes(r.status);
    if (handling && r.status !== 'For Intervention') list.push(['intervene', 'For intervention', 'btn-quiet']);
    if (handling && r.status !== 'For Referral') list.push(['refer', 'For referral', 'btn-quiet']);
    if (handling) list.push(['resolve', 'Mark resolved', '']);
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

  // The offices a case can be referred to (public/assets/referrals.json, the server checks the same file)
  let agenciesPromise = null;
  const agencies = () => (agenciesPromise ??= fetch('/assets/referrals.json').then((x) => x.json())
    .then((j) => (Array.isArray(j.agencies) ? j.agencies : []).filter((a) => a && a.name && a.name !== 'Other'))
    .catch(() => { agenciesPromise = null; return []; }));

  // "For referral": where the case goes, plus an optional note. Resolves { agency, agencyOther, note } or null.
  async function askReferral(r) {
    const list = await agencies();
    return new Promise((resolve) => {
      let done = false;
      LIA.openModal({
        title: `Refer case ${LIA.caseNo(r)}`,
        body: `<form id="refForm" novalidate>
            <div class="field"><label for="agency">Referred to</label>
              <select class="input" id="agency" name="agency">
                <option value="">Select an office...</option>
                ${list.map((a, i) => `<option value="${LIA.esc(a.name)}" data-i="${i}">${LIA.esc(a.name)}</option>`).join('')}
                <option value="Other">Other (type it)</option>
              </select>
              <p class="hint" id="agencyContact"></p></div>
            <div class="field" id="agencyOtherField" hidden><label for="agencyOther">Office</label>
              <input class="input" id="agencyOther" name="agencyOther" maxlength="150" placeholder="e.g. Barangay Greater Lagro VAWC Desk"></div>
            <div class="field"><label for="refNote">Note for staff (optional)</label>
              <textarea class="input" id="refNote" name="note" maxlength="1000" placeholder="e.g. Parents informed. Appointment on Monday."></textarea>
              <p class="hint">Only staff see where the case was referred and this note. The student sees "Referred for more support".</p></div>
          </form>`,
        foot: `<button class="btn btn-quiet" data-close>Cancel</button><button class="btn" form="refForm" type="submit">Refer case</button>`,
        onOpen: (el, close) => {
          const f = el.querySelector('#refForm');
          f.agency.addEventListener('change', () => {
            el.querySelector('#agencyOtherField').hidden = f.agency.value !== 'Other';
            const a = list[f.agency.selectedOptions[0]?.dataset.i];
            el.querySelector('#agencyContact').textContent = a?.contact ? 'Contact: ' + a.contact : '';
          });
          f.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!f.agency.value) return LIA.showFormError(f, 'Choose where the case is referred to.');
            if (f.agency.value === 'Other' && !f.agencyOther.value.trim()) return LIA.showFormError(f, 'Type the office the case is referred to.');
            done = true; close();
            resolve({ agency: f.agency.value, agencyOther: f.agencyOther.value.trim(), note: f.note.value.trim() });
          });
          new MutationObserver((_, obs) => { if (!el.isConnected) { obs.disconnect(); if (!done) resolve(null); } })
            .observe(document.body, { childList: true });
        },
      });
    });
  }

  // Runs one action. Returns true if it worked.
  async function act(r, action, button) {
    let body = { action, reportNo: r.reportNo };
    if (action === 'reject') {
      const reason = await askReason();
      if (!reason) return false;
      body.reason = reason;
    }
    if (action === 'refer') {
      const ref = await askReferral(r);
      if (!ref) return false;
      body = { ...body, ...ref };
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
  // fromMessages: opened from the Messages page. The status buttons (For referral, Mark resolved, ...)
  // are replaced by one button that opens the same case in Manage Reports (or Report Records once it
  // is Resolved or Rejected), where the case is handled. Fewer buttons next to the chat.
  function open(r, onChange, { fromMessages = false } = {}) {
    const p = r.reporter || {};
    let shown = null; // the student details, once the password was typed
    const finished = r.status === 'Resolved' || r.status === 'Rejected';
    const buttons = fromMessages
      ? `<a class="btn" href="${finished ? '/admin/records.html' : '/admin/cases.html'}#report-${r.reportNo}">${finished ? 'View in Report Records' : 'View in Manage Reports'}</a>`
      : actionsFor(r).map(([a, label, cls]) => `<button class="btn ${cls}" data-act="${a}">${label}</button>`).join('');

    LIA.openModal({
      title: `Report Case No. ${LIA.caseNo(r)}`,
      wide: true,
      className: 'case-modal',
      body: `
        <p style="margin:0 0 14px">${LIA.chip(r.status, 'staff')} ${r.archived ? '<span class="chip rejected">Archived</span>' : ''}</p>
        ${r.relatedReportNo ? `<div class="form-note related-note">${LIA.icon('folder')}<span>This is a follow-up to the reporter's earlier report <b>${LIA.esc(LIA.caseNo({ caseId: r.relatedCaseId, reportNo: r.relatedReportNo }))}</b>.</span>
          <button class="btn btn-quiet btn-sm" type="button" data-related>View Earlier Report</button></div>` : ''}
        <div class="case-grid">
          <section class="case-section">
            <h3>Student Account Details</h3>
            <div data-student>
              <dl class="case-facts">${row('Reporter', r.anonymous ? 'Anonymous (identity hidden)' : p.name)}${row('Grade Level', gradeText(r))}</dl>
              ${r.reporter || r.anonymous ? `<button class="btn btn-quiet btn-sm" type="button" data-reveal style="margin-top:10px">${LIA.icon('lock')} ${r.anonymous ? 'Show contact number' : 'Show student details'}</button>` : ''}
            </div>
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
        ${r.status === 'Rejected' ? `<h3 style="margin-top:16px">Reason given to the student</h3><div class="reason">${LIA.esc(r.rejectReason)}</div>` : ''}
        ${r.referredTo ? `<h3 style="margin-top:16px">${r.status === 'For Referral' ? 'Referred to' : 'Last referred to'}</h3><div class="quote-box"><b>${LIA.esc(r.referredTo)}</b>${r.referralNote ? `<br>${LIA.esc(r.referralNote)}` : ''}</div>` : ''}
        <h3 style="margin-top:16px">Case History</h3>
        <ol class="case-history" data-history><li class="muted">Loading...</li></ol>`,
      foot: `${buttons}
        ${r.canMessage && !fromMessages ? `<a class="btn btn-quiet" href="/admin/messages.html?case=${r.reportNo}">Message</a>` : ''}
        ${r.status !== 'Pending' ? `<button class="btn btn-ghost" data-print>Print</button>
        <button class="btn btn-ghost" data-pdf>Save as PDF</button>` : ''}
        <button class="btn btn-gray" data-close>Close</button>`,
      onOpen: (el, close) => {
        // Follow-up: open the earlier report it is linked to
        el.querySelector('[data-related]')?.addEventListener('click', async () => {
          try {
            const { reports } = await LIA.api('admin/reports.php');
            const earlier = reports.find((x) => x.reportNo === r.relatedReportNo);
            if (earlier) open(earlier, onChange, { fromMessages }); else LIA.toast('That report is handled by another grade level.', 'error');
          } catch (err) { LIA.toast(err.message, 'error'); }
        });
        el.querySelector('[data-reveal]')?.addEventListener('click', async () => {
          const s = await studentDetails({ report: r.reportNo });
          if (s) { shown = s; el.querySelector('[data-student]').innerHTML = studentFacts(s); }
        });
        // Who did what to this report, and when (from the audit log)
        const hist = el.querySelector('[data-history]');
        let historyRows = [];
        LIA.api('admin/reports.php?history=' + r.reportNo).then(({ history }) => {
          historyRows = history.map((h) => [`Case history · ${LIA.fmtDateTime(h.at)}`, `${h.what} by ${h.by}${h.action === 'report.refer' && h.details ? ' · ' + h.details : ''}`]);
          hist.innerHTML = `<li><b>Report submitted</b> <span class="muted">· ${LIA.esc(LIA.fmtDateTime(r.submittedAt))}</span></li>` +
            history.map((h) => `<li><b>${LIA.esc(h.what)}</b> by ${LIA.esc(h.by)} <span class="muted">· ${LIA.esc(LIA.fmtDateTime(h.at))}</span>${h.action === 'report.refer' && h.details ? `<br><span class="small">${LIA.esc(h.details)}</span>` : ''}</li>`).join('');
        }).catch((e) => { hist.innerHTML = `<li class="muted">${LIA.esc(e.message)}</li>`; });
        // Save this case record as a PDF (two columns: field and details)
        el.querySelector('[data-pdf]')?.addEventListener('click', () => {
          const rows = [
            ['Case No.', LIA.caseNo(r)],
            ...(r.relatedReportNo ? [['Follow-up to', LIA.caseNo({ caseId: r.relatedCaseId, reportNo: r.relatedReportNo })]] : []),
            ['Status', r.status + (r.archived ? ' (archived)' : '')],
            // Student details are only in the PDF if they were shown with the password first
            ['Reporter', r.anonymous ? `Anonymous${shown?.contactNumber ? ' · Contact number: ' + shown.contactNumber : ''}`
              : [p.name, shown ? (shown.accountType === 'student' ? 'Student' : 'Guest') : '', shown?.gradeSection, shown?.adviser && 'Adviser: ' + shown.adviser, shown?.contactNumber && 'Contact: ' + shown.contactNumber].filter(Boolean).join(' · ')],
            ['Grade Level', gradeText(r)],
            ['Category of Bullying', r.category],
            ['Date of Incident', LIA.fmtDate(r.incidentDate)],
            ['Date & Time Filed', LIA.fmtDateTime(r.submittedAt)],
            ['Location', r.location],
            ['Reporter is', LIA.ROLE[r.reporterRole] || ''],
            ['Knows Person(s) Involved?', r.involvedKnown ? 'Yes' : 'No'],
            ...(r.involvedKnown ? [['Person(s) Involved', r.involvedDescription]] : []),
            ['Description', r.description],
            ...(r.status === 'Rejected' ? [['Reason given to the student', r.rejectReason || '']] : []),
            ...(r.referredTo ? [['Referred to', r.referredTo + (r.referralNote ? ' · ' + r.referralNote : '')]] : []),
            ['Case history · ' + LIA.fmtDateTime(r.submittedAt), 'Report submitted'],
            ...historyRows,
          ];
          PRINT.savePdf({ title: `Report Case No. ${LIA.caseNo(r)}`, columns: [{ label: 'Field', width: 150 }, { label: 'Details' }], rows, filename: `case-${r.caseId || r.reportNo}`, landscape: false, note: 'Case record' });
        });
        el.querySelector('[data-print]')?.addEventListener('click', () => {
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

  return { open, act, actionsFor, reporterType, reporterLabel, showStudent };
})();
