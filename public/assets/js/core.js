/* =====================================================================
   LagroInAction - shared code used by every page
   ---------------------------------------------------------------------
   - LIA.api(...)      talks to the PHP backend
   - LIA.start(...)    checks who is signed in and draws the top bar,
                       side menu, mobile tab bar and SOS button
   - helpers for dates, toasts (small pop-up messages) and modals
   ===================================================================== */

const LIA = (() => {
  // The version shown on the sign-in pages. Change it here when you tag a new version.
  const VERSION = 'v1.0.0-alpha.3';
  document.querySelectorAll('[data-version]').forEach((el) => { el.textContent = VERSION; });

  // ---------- Icons (simple line drawings, 24x24) ----------
  const ICONS = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5 2.5 2.5 0 0 0 6.5 24"/><path d="M8 7h8M8 11h6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    chart: '<path d="M3 21h18M6 17V10M11 17V5M16 17v-5M21 17V8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    archive: '<path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  };
  function icon(name, extraClass = '') {
    return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  // ---------- Safe text ----------
  // Always use esc() when putting text from the database into HTML.
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ---------- Talking to the backend ----------
  // api('reports/mine.php')                     -> GET
  // api('reports/create.php', { body: form })   -> POST (form = FormData or object)
  // ---------- Loading line at the top of the page ----------
  // Shows while the page starts and while any request is waiting for the server.
  const loading = (() => {
    let bar = null, busyCount = 0, creep = null;
    const el = () => {
      if (!bar) { bar = document.createElement('div'); bar.className = 'loadbar'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar); }
      return bar;
    };
    function start() {
      busyCount++;
      if (busyCount > 1) return;
      const b = el(); let p = 0.15;
      b.classList.add('on'); b.style.transform = `scaleX(${p})`;
      clearInterval(creep);
      creep = setInterval(() => { p += (0.9 - p) * 0.15; b.style.transform = `scaleX(${p})`; }, 250); // slows down near 90%
    }
    function done() {
      busyCount = Math.max(0, busyCount - 1);
      if (busyCount) return;
      clearInterval(creep);
      const b = el(); b.style.transform = 'scaleX(1)';
      setTimeout(() => { if (!busyCount) { b.classList.remove('on'); setTimeout(() => { if (!busyCount) b.style.transform = 'scaleX(0)'; }, 250); } }, 200);
    }
    return { start, done };
  })();
  if (document.body.dataset.area) loading.start(); // signed-in pages: line runs until LIA.start() is done

  async function api(path, options = {}) {
    loading.start();
    try { return await apiRequest(path, options); } finally { loading.done(); }
  }

  async function apiRequest(path, options = {}) {
    const init = { method: options.body ? 'POST' : 'GET', headers: {}, credentials: 'same-origin' };
    if (options.body) {
      init.headers['X-LIA'] = '1'; // our own pages always send this (see includes/bootstrap.php)
      if (options.body instanceof FormData) {
        init.body = options.body;
      } else {
        init.body = new URLSearchParams(options.body);
      }
    }
    // Give up after 60 seconds so buttons don't stay "loading" forever.
    // (60 s because Render's free plan can take about 50 s to wake up.)
    const timer = new AbortController();
    const stop = setTimeout(() => timer.abort(), 60000);
    init.signal = timer.signal;
    let res;
    try {
      res = await fetch('/api/' + path, init);
    } catch (e) {
      const msg = e.name === 'AbortError'
        ? 'LagroInAction is taking too long to answer. Please try again.'
        : "Can't reach LagroInAction. Check your internet connection and try again.";
      throw Object.assign(new Error(msg), { network: true });
    } finally {
      clearTimeout(stop);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401 && data && data.sessionExpired && !options.allow401) {
      goToSignIn();
      throw new Error(data.message);
    }
    if (!data) throw new Error('The server sent an unexpected reply. Reload the page and try again.');
    if (!data.success) throw Object.assign(new Error(data.message || 'Something went wrong.'), { data, status: res.status });
    // A button changed something (dispatch, accept, approve, reply...): tell the page so the
    // sidebar counters and the red SOS strip update right away instead of waiting.
    if (init.method === 'POST') document.dispatchEvent(new CustomEvent('lia:changed', { detail: { path } }));
    return data;
  }

  function goToSignIn() {
    const staff = document.body.dataset.area === 'admin';
    location.href = staff ? '/staff.html' : '/index.html';
  }

  // ---------- Dates ----------
  // The database sends times in UTC; show them in Philippine time.
  function toDate(value) {
    if (!value) return null;
    let s = String(value).trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00+08:00'); // a plain date
    s = s.replace(/\.(\d{3})\d*/, '.$1');                 // trim microseconds
    if (/[+-]\d{2}$/.test(s)) s += ':00';                   // "+00" -> "+00:00"
    else if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';    // no zone -> UTC
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const TZ = 'Asia/Manila';
  function fmtDate(value) {
    const d = toDate(value);
    return d ? d.toLocaleDateString('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' }) : '';
  }
  function fmtDateTime(value) {
    const d = toDate(value);
    return d ? d.toLocaleString('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  }
  function fmtTime(value) {
    const d = toDate(value);
    return d ? d.toLocaleTimeString('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }) : '';
  }
  function timeAgo(value) {
    const d = toDate(value);
    if (!d) return '';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
    if (s < 7 * 86400) return Math.floor(s / 86400) + (s < 2 * 86400 ? ' day ago' : ' days ago');
    return fmtDate(value);
  }
  function daysLeft(value) {
    const d = toDate(value);
    return d ? Math.ceil((d.getTime() - Date.now()) / 86400000) : null;
  }
  function todayInManila() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
  }

  // ---------- Report status, in words students understand ----------
  const STATUS = {
    'Pending': { cls: 'pending', student: 'Waiting for review', staff: 'New' },
    'Active': { cls: 'active', student: 'Accepted · being handled', staff: 'Active' },
    'Under Investigation': { cls: 'invest', student: 'Under investigation', staff: 'Under investigation' },
    'Resolved': { cls: 'resolved', student: 'Resolved', staff: 'Resolved' },
    'Rejected': { cls: 'rejected', student: 'Not accepted', staff: 'Rejected' },
  };
  function chip(status, who = 'student') {
    const s = STATUS[status] || { cls: 'rejected', student: status, staff: status };
    return `<span class="chip ${s.cls}">${esc(s[who])}</span>`;
  }
  const ROLE = { victim: 'I was bullied', witness: 'I saw it happen', other: 'Other' };

  // ---------- Toasts ----------
  function toast(message, type = 'ok') {
    let box = document.querySelector('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.append(box);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.innerHTML = icon(type === 'error' ? 'alert' : 'check') + `<span>${esc(message)}</span>`;
    box.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  // ---------- Modals ----------
  // openModal({ title, body (HTML), foot (HTML), wide, className, onOpen(el), dismissable })
  function openModal({ title, body, foot = '', wide = false, className = '', onOpen, dismissable = true }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'wide' : ''} ${className}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <h2 id="modalTitle">${esc(title)}</h2>
          ${dismissable ? `<button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>` : ''}
        </div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>`;
    const previousFocus = document.activeElement;
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) close();
      if (e.key === 'Tab') trapFocus(e, wrap);
    };
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || (dismissable && e.target === wrap)) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.append(wrap);
    const first = wrap.querySelector('input, textarea, select, button:not([data-close])');
    (first || wrap.querySelector('.modal')).focus?.();
    onOpen?.(wrap, close);
    return close;
  }
  function trapFocus(e, root) {
    const items = [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function confirmBox({ title, text, confirmLabel, danger = false }) {
    return new Promise((resolve) => {
      let answered = false;
      const close = openModal({
        title,
        body: `<p>${esc(text)}</p>`,
        foot: `<button class="btn btn-quiet" data-close>Cancel</button>
               <button class="btn ${danger ? 'btn-sos' : ''}" data-yes>${esc(confirmLabel)}</button>`,
        onOpen: (el) => {
          el.querySelector('[data-yes]').addEventListener('click', () => { answered = true; close(); resolve(true); });
          new MutationObserver((_, obs) => { if (!el.isConnected) { obs.disconnect(); if (!answered) resolve(false); } })
            .observe(document.body, { childList: true });
        },
      });
    });
  }

  // ---------- Forms ----------
  function showFormError(form, message) {
    let box = form.querySelector('.form-error');
    if (!message) { box?.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      form.prepend(box);
    }
    box.innerHTML = icon('alert') + `<span>${esc(message)}</span>`;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  async function busy(button, task) {
    button.disabled = true;
    button.classList.add('is-busy');
    try { return await task(); }
    finally { button.disabled = false; button.classList.remove('is-busy'); }
  }
  // Show/hide password buttons: <div class="pw-wrap"><input ...><button class="icon-btn pw-toggle" data-pw-toggle>
  function wirePasswordToggles(root = document) {
    root.querySelectorAll('[data-pw-toggle]').forEach((btn) => {
      btn.innerHTML = icon('eye');
      btn.setAttribute('aria-label', 'Show password');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = icon(show ? 'eyeOff' : 'eye');
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
  }
  async function copyText(text, label = 'Copied') {
    try { await navigator.clipboard.writeText(text); toast(label); }
    catch (e) { toast('Could not copy. Select the text and copy it instead.', 'error'); }
  }

  // ---------- Change password (used on the guest welcome page and Account page) ----------
  // knownCurrentPassword: on the welcome page we already know it, so we don't ask for it.
  function changePasswordModal(knownCurrentPassword = null, onDone) {
    const askCurrent = knownCurrentPassword === null;
    openModal({
      title: 'Change password',
      body: `
        <form id="pwForm" novalidate>
          ${askCurrent ? `
          <div class="field">
            <label for="pwCurrent">Current password</label>
            <div class="pw-wrap"><input class="input" id="pwCurrent" name="currentPassword" type="password" autocomplete="current-password" required><button class="icon-btn pw-toggle" data-pw-toggle></button></div>
          </div>` : ''}
          <div class="field">
            <label for="pwNew">New password</label>
            <div class="pw-wrap"><input class="input" id="pwNew" name="newPassword" type="password" autocomplete="new-password" required><button class="icon-btn pw-toggle" data-pw-toggle></button></div>
            <p class="hint">At least 8 characters, with a letter and a number.</p>
          </div>
          <div class="field">
            <label for="pwConfirm">Re-type new password</label>
            <div class="pw-wrap"><input class="input" id="pwConfirm" name="confirmPassword" type="password" autocomplete="new-password" required><button class="icon-btn pw-toggle" data-pw-toggle></button></div>
          </div>
        </form>`,
      foot: `<button class="btn btn-quiet" data-close>Cancel</button><button class="btn" form="pwForm" type="submit">Change password</button>`,
      onOpen: (el, close) => {
        wirePasswordToggles(el);
        const form = el.querySelector('#pwForm');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          if (!askCurrent) fd.set('currentPassword', knownCurrentPassword);
          if (fd.get('newPassword') !== fd.get('confirmPassword')) return showFormError(form, "The new passwords don't match.");
          try {
            await busy(el.querySelector('button[type=submit]'), () => api('account/password.php', { body: fd }));
            close();
            toast('Password changed.');
            onDone?.(fd.get('newPassword'));
          } catch (err) { showFormError(form, err.message); }
        });
      },
    });
  }

  // ---------- SOS ----------
  // Places for SOS alerts. Must match REPORT_LOCATIONS in includes/validation.php.
  const SOS_LOCATIONS = ['Classroom', 'Hallway or stairs', 'Canteen', 'Comfort room', 'School gate',
    'Covered court or field', 'Library', 'Online or group chat', 'Outside school', 'Other'];

  function openSos() {
    openModal({
      title: 'Send an SOS',
      className: 'sos-modal',
      body: `
        <p>This alerts the guidance office right away. Use it when you are in danger or need help now.</p>
        <form id="sosForm" novalidate>
          <div class="field">
            <label for="sosWhere">Where are you right now?</label>
            <select class="input" id="sosWhere" name="location" required>
              <option value="">Select location...</option>
              ${SOS_LOCATIONS.map((p) => `<option${p === 'Other' ? ' value="Other">Others' : `>${p}`}</option>`).join('')}
            </select>
          </div>
          <div class="field" id="sosOtherField" hidden>
            <label for="sosOther">Type the place</label>
            <input class="input" id="sosOther" name="locationOther" maxlength="200" placeholder="e.g. Room 204, Building B">
          </div>
          <div class="field">
            <label for="sosWhat">What is happening?</label>
            <textarea class="input" id="sosWhat" name="description" maxlength="1000" style="min-height:90px" placeholder="e.g. A group is blocking me and threatening me" required></textarea>
          </div>
        </form>
        <div class="form-note warn small">If someone is hurt or in immediate danger, also call <a href="tel:911"><b>911</b></a> or the Quezon City hotline <a href="tel:122"><b>122</b></a>.</div>`,
      foot: `<button class="btn btn-quiet" data-close>Cancel</button><button class="btn btn-sos btn-big" form="sosForm" type="submit">${icon('alert')} Send SOS now</button>`,
      onOpen: (el, close) => {
        const form = el.querySelector('#sosForm');
        const otherField = el.querySelector('#sosOtherField');
        form.location.addEventListener('change', () => { otherField.hidden = form.location.value !== 'Other'; });
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!form.location.value) return showFormError(form, 'Choose where you are right now.');
          if (form.location.value === 'Other' && !form.locationOther.value.trim()) return showFormError(form, 'Type where you are right now.');
          if (!form.description.value.trim()) return showFormError(form, 'Say briefly what is happening.');
          try {
            await busy(el.querySelector('button[type=submit]'), () => api('sos/create.php', { body: new FormData(form) }));
            close();
            openModal({
              title: 'SOS sent',
              body: `<p><b>The guidance office has been alerted.</b> Stay where it is safest. If you can, move near a teacher or a guard.</p>
                     <p class="muted">Emergency hotlines: <a href="tel:911">911</a> · Quezon City <a href="tel:122">122</a></p>`,
              foot: `<button class="btn" data-close>OK</button>`,
            });
          } catch (err) {
            // Fail safe: if the SOS could not reach the server, say so clearly and point to other help.
            const failed = err.network || !err.status || err.status >= 500;
            showFormError(form, failed ? `Your SOS was NOT sent. ${err.message} Call 911 or 122, or go to the guidance office now.` : err.message);
          }
        });
      },
    });
  }

  // ---------- Page shell ----------
  const USER_NAV = [
    { id: 'home', href: '/app/home.html', icon: 'home', label: 'Home' },
    { id: 'report', href: '/app/report.html', icon: 'flag', label: 'Submit Report' },
    { id: 'messages', href: '/app/messages.html', icon: 'chat', label: 'Message' },
    { id: 'account', href: '/app/account.html', icon: 'user', label: 'My Account' },
  ];
  const USER_EXTRA = [
    { id: 'guide', href: '/app/guide.html', icon: 'book', label: 'What counts as bullying' },
    { id: 'terms', href: '/terms.html', icon: 'shield', label: 'Terms & privacy' },
  ];
  const ADMIN_NAV = [
    { id: 'home', href: '/admin/home.html', icon: 'home', label: 'Home' },
    { id: 'dashboard', href: '/admin/index.html', icon: 'chart', label: 'Dashboard' },
    { id: 'cases', href: '/admin/cases.html', icon: 'folder', label: 'Manage Reports', count: 'cases' },
    { id: 'records', href: '/admin/records.html', icon: 'archive', label: 'Report Records' },
    { id: 'accounts', href: '/admin/accounts.html', icon: 'users', label: 'Registration Requests', count: 'accounts' },
    { id: 'messages', href: '/admin/messages.html', icon: 'chat', label: 'Messages', count: 'messages' },
  ];

  function initials(name) {
    if (/^Guest\b/.test(String(name))) return 'G';
    const parts = String(name || '?').replace(/\([^)]*\)/g, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function navLink(item, current) {
    return `<a class="nav-link" href="${item.href}" ${item.id === current ? 'aria-current="page"' : ''}>
      ${icon(item.icon)}<span>${esc(item.label)}</span>${item.count ? `<span class="count" data-count="${item.count}" hidden></span>` : ''}</a>`;
  }

  function buildShell(me) {
    const area = document.body.dataset.area;
    const current = document.body.dataset.page;
    const isAdmin = area === 'admin';
    const acct = me.account;
    const isGuest = !isAdmin && acct.accountType === 'guest';
    const name = isAdmin ? acct.displayName : (isGuest ? 'Guest ' + acct.guestId : acct.fullName || acct.username);

    const top = document.createElement('header');
    top.className = 'topbar';
    top.innerHTML = `
      <button class="icon-btn" id="navToggle" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
      <img class="seal" src="/assets/img/lagro-seal.png" alt="Lagro High School">
      <a class="topbar-title" href="${isAdmin ? '/admin/index.html' : '/app/home.html'}">Lagro<b>In</b>Action</a>
      <div class="topbar-right">
      ${isAdmin ? `<span class="admin-tag" title="You are signed in to the staff side of LagroInAction">${icon('shield')}<span class="hide-sm">LagroInAction Administrator Access</span><span class="show-sm">Admin</span></span>` : ''}
      <div class="menu">
        <button class="menu-btn" id="acctBtn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
          <span class="menu-name">${esc(name)}</span>
          <span class="avatar ${isGuest ? 'guest' : ''}">${esc(initials(name))}</span>
        </button>
        <div class="menu-panel" id="acctMenu" hidden>
          <div class="menu-head">
            <span class="avatar ${isGuest ? 'guest' : ''}">${esc(initials(name))}</span>
            <div><strong>${esc(name)}</strong><span class="small muted">${isAdmin ? 'Guidance staff' : isGuest ? 'Guest account' : 'Student account'}</span></div>
          </div>
          ${isAdmin ? '' : `<a class="menu-item" href="/app/account.html">${icon('user')} Account</a>`}
          <button class="menu-item" id="signOut">${icon('logout')} Sign out</button>
        </div>
      </div>
      </div>`;

    const side = document.createElement('nav');
    side.className = 'sidebar';
    side.setAttribute('aria-label', 'Main menu');
    side.innerHTML = isAdmin
      ? `<div class="nav-group">${ADMIN_NAV.map((i) => navLink(i, current)).join('')}</div>
         <p class="sidebar-foot">LagroInAction · Lagro High School Guidance Office</p>`
      : `<button class="sidebar-sos" id="sosSide" type="button">SOS<small>Tap if you need help now</small></button>
         <div class="nav-group">${USER_NAV.map((i) => navLink(i, current)).join('')}</div>
         <div class="nav-group extra"><p class="nav-heading">Learn</p>${USER_EXTRA.map((i) => navLink(i, current)).join('')}</div>
         <div class="nav-group extra"><p class="nav-heading">Emergency hotlines</p>
           <a class="nav-link" href="tel:911">${icon('phone')}<span>911 National</span></a>
           <a class="nav-link" href="tel:122">${icon('phone')}<span>122 Quezon City</span></a></div>
         <p class="sidebar-foot">LagroInAction · Lagro High School</p>`;

    const main = document.querySelector('main');
    main.classList.add('page');
    main.id = 'main';
    document.body.prepend(top, side);

    if (!isAdmin) {
      const tabs = document.createElement('nav');
      tabs.className = 'tabbar';
      tabs.setAttribute('aria-label', 'Quick menu');
      tabs.innerHTML = USER_NAV.map((i) => `<a href="${i.href}" ${i.id === current ? 'aria-current="page"' : ''}>${icon(i.icon)}${esc(i.label)}</a>`).join('');
      document.body.append(tabs);
      document.getElementById('sosSide').addEventListener('click', openSos);


    }


    // Green footer at the bottom of student pages and the staff Home page (like the prototype)
    if ((!isAdmin && current !== 'messages') || (isAdmin && current === 'home')) {
      const foot = document.createElement('footer');
      foot.className = 'site-footer';
      foot.innerHTML = `
        <div><h2>Lagro High School</h2><p><b>Address:</b> Misa de Gallo St. corner Ascension Ave., Brgy. Greater Lagro, Novaliches, Quezon City.</p></div>
        <div><h2>Contact Us</h2><p><b>Email:</b> <a href="mailto:lagrohighschool@gmail.com">lagrohighschool@gmail.com</a><br><b>Facebook:</b> Ask Lagro High School</p></div>
        <div><h2>Emergency Hotlines</h2><p><a href="tel:122">Quezon City Hotline - 122</a><br><a href="tel:911">National Emergency Hotline - 911</a></p></div>
        <p class="copy">© ${new Date().getFullYear()} Lagro High School - LagroInAction. All Rights Reserved.</p>`;
      main.append(foot);
    }

    // Menu button: on wide screens it shrinks the menu (like YouTube); on small screens it slides it out.
    const toggle = document.getElementById('navToggle');
    let scrim = null;
    const smallScreen = () => window.matchMedia('(max-width: 1100px)').matches;
    try { if (localStorage.getItem('lia-nav-mini') === '1') document.body.classList.add('nav-mini'); } catch (e) {}
    toggle.addEventListener('click', () => {
      if (smallScreen()) {
        const open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
        if (open) {
          scrim = document.createElement('div');
          scrim.className = 'scrim';
          scrim.addEventListener('click', () => toggle.click());
          document.body.append(scrim);
        } else { scrim?.remove(); }
      } else {
        const mini = document.body.classList.toggle('nav-mini');
        try { localStorage.setItem('lia-nav-mini', mini ? '1' : '0'); } catch (e) {}
      }
    });

    // Account menu
    const acctBtn = document.getElementById('acctBtn');
    const acctMenu = document.getElementById('acctMenu');
    acctBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      acctMenu.hidden = !acctMenu.hidden;
      acctBtn.setAttribute('aria-expanded', String(!acctMenu.hidden));
    });
    document.addEventListener('click', (e) => { if (!acctMenu.hidden && !acctMenu.contains(e.target)) { acctMenu.hidden = true; acctBtn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') acctMenu.hidden = true; });
    document.getElementById('signOut').addEventListener('click', async () => {
      try { await api('auth/logout.php', { body: {} }); } catch (e) { /* leaving anyway */ }
      location.href = isAdmin ? '/staff.html' : '/index.html';
    });
  }

  function setCount(name, n, calm = false) {
    document.querySelectorAll(`[data-count="${name}"]`).forEach((el) => {
      const text = n > 99 ? '99+' : String(n);
      const changed = el.textContent !== '' && el.textContent !== text;
      el.hidden = !n;
      el.textContent = text;
      el.classList.toggle('calm', calm);
      if (changed) { // small "bump" animation when the number changes
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      }
    });
  }

  // ---------- Staff: watch for new SOS alerts (sound + red strip) ----------
  let sosSeen = null;
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
      });
    } catch (e) { /* sound not available */ }
  }
  async function watchStaffCounts() {
    try {
      const [sos, reports, accounts, messages] = await Promise.all([
        api('admin/sos.php'), api('admin/reports.php'), api('admin/activations.php'), api('admin/messages.php'),
      ]);
      const active = sos.alerts.filter((a) => a.status === 'Active');
      const newReports = reports.reports.filter((r) => r.status === 'Pending').length;
      if (active.length) setCount('cases', active.length); else setCount('cases', newReports, true);
      setCount('accounts', accounts.pending.length, true);
      setCount('messages', messages.conversations.filter((c) => c.waitingForReply).length, true);

      // red strip across the top while any SOS is waiting
      let strip = document.querySelector('.sos-strip');
      if (active.length) {
        if (!strip) {
          strip = document.createElement('div');
          strip.className = 'sos-strip';
          strip.setAttribute('role', 'alert');
          document.body.append(strip);
        }
        strip.innerHTML = `${icon('alert')} <span>${active.length} active SOS ${active.length === 1 ? 'alert' : 'alerts'}. Latest: ${esc(active[0].location)} · ${esc(timeAgo(active[0].sentAt))}</span> <a href="/admin/cases.html#sos">Open SOS alerts</a>`;
        document.body.classList.add('has-sos-strip');
        document.body.style.setProperty('--strip-h', strip.offsetHeight + 'px');
      } else {
        strip?.remove();
        document.body.classList.remove('has-sos-strip');
        document.body.style.removeProperty('--strip-h');
      }

      const ids = new Set(active.map((a) => a.sosNo));
      if (sosSeen) {
        const fresh = active.filter((a) => !sosSeen.has(a.sosNo));
        if (fresh.length) {
          beep();
          toast(`New SOS: ${fresh[0].name} at ${fresh[0].location}`, 'error');
          document.dispatchEvent(new CustomEvent('lia:new-sos'));
        }
      }
      sosSeen = ids;
    } catch (e) { /* try again next time */ }
  }

  // ---------- Start a signed-in page ----------
  // Call LIA.start() at the top of each page script. It returns who is signed in.
  async function start() {
    const area = document.body.dataset.area; // "user" or "admin"
    // Tell the user when their internet drops and comes back (nothing is lost: report drafts are saved on this device)
    window.addEventListener('offline', () => toast("You're offline. Your report draft is kept on this device.", 'error'));
    window.addEventListener('online', () => toast("You're back online."));
    let me;
    try {
      me = await api('auth/me.php', { allow401: true });
    } catch (e) {
      goToSignIn();
      return new Promise(() => {}); // stop here while the browser leaves
    }
    if ((area === 'admin') !== (me.role === 'admin')) {
      location.href = me.role === 'admin' ? '/admin/index.html' : '/app/home.html';
      return new Promise(() => {});
    }
    buildShell(me);
    if (area === 'admin') {
      watchStaffCounts();
      setInterval(watchStaffCounts, 20000);
      // Update counters right after any action (small delay groups several quick clicks into one check)
      let soon;
      document.addEventListener('lia:changed', () => { clearTimeout(soon); soon = setTimeout(watchStaffCounts, 250); });
      // ...and when staff come back to this tab
      document.addEventListener('visibilitychange', () => { if (!document.hidden) watchStaffCounts(); });
    }
    // Phones: each table row is shown as a small card, so every cell needs its column name
    // (CSS shows it from data-label). Tables are redrawn often, so watch for new rows.
    const labelTables = () => document.querySelectorAll('table.data-table').forEach((t) => {
      const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => {
        if (!td.hasAttribute('data-label') && heads[i] && !td.hasAttribute('colspan')) td.setAttribute('data-label', heads[i]);
      }));
    });
    labelTables();
    let labelSoon = 0;
    new MutationObserver(() => { if (!labelSoon) labelSoon = requestAnimationFrame(() => { labelSoon = 0; labelTables(); }); })
      .observe(document.querySelector('main'), { childList: true, subtree: true });

    document.body.classList.add('ready');
    loading.done();
    return me;
  }

  return {
    VERSION, api, esc, icon, toast, openModal, confirmBox, showFormError, busy, wirePasswordToggles, copyText,
    changePasswordModal, openSos, start, setCount, initials, chip, STATUS, ROLE,
    toDate, fmtDate, fmtDateTime, fmtTime, timeAgo, daysLeft, todayInManila,
  };
})();
