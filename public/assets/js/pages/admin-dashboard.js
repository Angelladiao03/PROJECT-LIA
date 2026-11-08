// Staff dashboard (Guidance Counselor and Principal).
// Uses admin/stats.php, which only sends numbers (no names or case details).
//
//   - Tiles at the top: what needs attention right now (every report, not filtered).
//   - Incident Analytics: choose Days / Months / Years, a period, filters, and
//     "Compare with the previous period" (the same length of time just before).
//     Every chart below follows these choices. They are kept in the address bar,
//     so reloading the page (or sharing the link with another staff member) keeps them.
//   - Print Summary: all the numbers of the charts as a table (print or PDF).

(async () => {
  const me = await LIA.start();
  const counselor = me.account.role === 'counselor'; // the principal sees the same numbers, without links to cases
  document.getElementById('signedInAs').textContent = `Signed in as ${me.account.displayName} · ${me.account.roleLabel}`;
  document.getElementById('sosLink').hidden = !counselor;
  const $ = (id) => document.getElementById(id);

  // ---------- Dates (plain YYYY-MM-DD strings, Philippine dates) ----------
  const today = LIA.todayInManila();
  const toD = (s) => new Date(s + 'T00:00:00Z');                      // date string -> Date (UTC midnight)
  const toS = (d) => d.toISOString().slice(0, 10);                     // Date -> date string
  const addDays = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return toS(d); };
  const monthStart = (s, back = 0) => { const d = toD(s.slice(0, 7) + '-01'); d.setUTCMonth(d.getUTCMonth() - back); return toS(d); };
  const yearStart = (s, back = 0) => `${Number(s.slice(0, 4)) - back}-01-01`;
  const fmt = (s, opts) => toD(s).toLocaleDateString('en-PH', { timeZone: 'UTC', ...opts });
  const longDate = (s) => fmt(s, { month: 'short', day: 'numeric', year: 'numeric' });

  // Period choices for each view. range() returns [from, to].
  const RANGES = {
    day: [
      ['7d', 'Last 7 days', () => [addDays(today, -6), today]],
      ['14d', 'Last 14 days', () => [addDays(today, -13), today]],
      ['30d', 'Last 30 days', () => [addDays(today, -29), today]],
      ['thisMonth', 'This month', () => [monthStart(today), today]],
      ['lastMonth', 'Last month', () => [monthStart(today, 1), addDays(monthStart(today), -1)]],
    ],
    month: [
      ['6m', 'Last 6 months', () => [monthStart(today, 5), today]],
      ['12m', 'Last 12 months', () => [monthStart(today, 11), today]],
      ['thisYear', 'This year', () => [yearStart(today), today]],
      ['lastYear', 'Last year', () => [yearStart(today, 1), addDays(yearStart(today), -1)]],
    ],
    year: [
      ['3y', 'Last 3 years', () => [yearStart(today, 2), today]],
      ['5y', 'Last 5 years', () => [yearStart(today, 4), today]],
      ['all', 'All years', () => [yearStart(firstReport || today), today]],
    ],
  };
  const DEFAULT_RANGE = { day: '30d', month: '6m', year: '3y' };
  const FILTERS = { grade: 'fGrade', category: 'fCategory', location: 'fLocation', status: 'fStatus', role: 'fRole' };
  let firstReport = null; // date of the first report (for "All years")

  // ---------- The choices, kept in the address bar ----------
  const url = new URLSearchParams(location.search);
  const state = {
    group: ['day', 'month', 'year'].includes(url.get('group')) ? url.get('group') : 'month',
    range: url.get('range') || '',
    from: url.get('from') || '',
    to: url.get('to') || '',
    compare: url.get('compare') === '1',
  };
  Object.keys(FILTERS).forEach((k) => { state[k] = url.get(k) || ''; });

  function saveState() {
    const p = new URLSearchParams();
    p.set('group', state.group);
    p.set('range', state.range);
    if (state.range === 'custom') { p.set('from', state.from); p.set('to', state.to); }
    if (state.compare) p.set('compare', '1');
    Object.keys(FILTERS).forEach((k) => { if (state[k]) p.set(k, state[k]); });
    history.replaceState(null, '', '?' + p.toString());
  }

  function fillRanges() {
    const list = RANGES[state.group];
    if (state.range !== 'custom' && !list.some(([k]) => k === state.range)) state.range = DEFAULT_RANGE[state.group];
    $('fRange').innerHTML = list.map(([k, label]) => `<option value="${k}">${label}</option>`).join('') + '<option value="custom">Custom dates</option>';
    $('fRange').value = state.range;
    document.querySelectorAll('[data-group]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.group === state.group)));
    $('customFrom').hidden = $('customTo').hidden = state.range !== 'custom';
  }

  function period() {
    if (state.range === 'custom') {
      let from = state.from || addDays(today, -29), to = state.to || today;
      if (to > today) to = today;
      if (from > to) [from, to] = [to, from];
      return [from, to];
    }
    return RANGES[state.group].find(([k]) => k === state.range)[2]();
  }

  // ---------- Small helpers for numbers ----------
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  // "▲ 3 (+25%)", "▼ 2 (−40%)", "No change", "▲ 4 (new)"
  function change(now, before) {
    if (before === null || before === undefined) return '';
    const d = now - before;
    if (d === 0) return 'No change';
    const pct = before ? `${d > 0 ? '+' : '−'}${Math.round(Math.abs(d) / before * 100)}%` : 'none before';
    return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} (${pct})`;
  }
  const ROLE_NAME = (k) => LIA.ROLE[k] || 'Not given (older report)';
  const STATUS_NAME = (k) => LIA.STATUS[k]?.staff || k;
  const WEEKDAY = (k) => ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][k] || 'Date not given';

  // Label of one bar of the trend chart
  function bucketLabel(key, group, long = false) {
    if (group === 'year') return key;
    if (group === 'month') return fmt(key + '-01', long ? { month: 'long', year: 'numeric' } : { month: 'short' });
    return long ? fmt(key, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : fmt(key, { month: 'short', day: 'numeric' });
  }

  // The filters in use, in words (e.g. ["Grade 10", "Cyberbullying"])
  const activeFilters = () => Object.entries(FILTERS).filter(([k]) => state[k]).map(([k, id]) => $(id).selectedOptions[0]?.textContent || state[k]);

  let last = null; // the latest numbers (for Print Summary)
  let filtersFilled = false;

  // ---------- Draw everything ----------
  async function render() {
    const [from, to] = period();
    const q = new URLSearchParams({ group: state.group, from, to });
    if (state.compare) q.set('compare', '1');
    Object.keys(FILTERS).forEach((k) => { if (state[k]) q.set(k, state[k]); });
    let s;
    try { s = await LIA.api('admin/stats.php?' + q.toString()); } catch (e) {
      $('periodText').textContent = e.message;
      LIA.toast(e.message, 'error');
      if (!last) $('tiles').innerHTML = `<div class="empty"><strong>The dashboard could not be loaded</strong><span>${LIA.esc(e.message)}</span></div>`;
      return;
    }
    last = s;
    // "All years" starts at the year of the first report, which is only known after the first load
    if (state.range === 'all' && s.options.firstReport && s.options.firstReport !== firstReport) {
      firstReport = s.options.firstReport;
      if (from !== yearStart(firstReport)) return render();
    }
    firstReport = s.options.firstReport;
    if (!filtersFilled) fillFilters(s.options);

    // Live tiles. Only "Active SOS" turns red, and only when there is one.
    const t = s.tiles;
    const tile = (n, label, sub, href, alert = false) => {
      const inner = `<span class="t">${label}</span><span class="n">${n}</span><span class="sub">${sub}</span>`;
      return counselor && href ? `<a class="tile ${alert && n ? 'alert' : ''}" href="${href}">${inner}</a>` : `<div class="tile ${alert && n ? 'alert' : ''}">${inner}</div>`;
    };
    $('tiles').innerHTML =
      tile(t.activeSos, 'Active SOS', 'Needs response now', '/admin/cases.html#sos', true) +
      (t.pendingAccounts !== null ? tile(t.pendingAccounts, 'Registration Requests', 'Waiting for approval', '/admin/accounts.html') : '') +
      tile(t.total, 'Total Reports', 'All reports received', '/admin/records.html') +
      tile(t.pending, 'Pending Review', 'New, not yet reviewed', '/admin/cases.html') +
      tile(t.investigating, 'Being Handled', 'Accepted, investigating, intervention or referral', '/admin/cases.html') +
      tile(t.resolved, 'Resolved', 'Cases closed', '/admin/records.html');

    // What is shown
    const p = s.period;
    const active = activeFilters();
    $('periodText').textContent = `Showing reports submitted ${longDate(p.from)} to ${longDate(p.to)}`
      + (p.compare ? `, compared with ${longDate(p.prevFrom)} to ${longDate(p.prevTo)}` : '')
      + (active.length ? ` · Filters: ${active.join(', ')}` : ' · All reports');

    // Period tiles: totals of the chosen period, and the change when comparing
    const cur = s.summary.current, prev = s.summary.previous;
    const ptile = (label, n, before, sub) => `<div class="tile period">
        <span class="t">${label}</span><span class="n">${n}</span>
        <span class="sub">${LIA.esc(sub)}</span>${prev ? `<span class="delta">${LIA.esc(change(typeof n === 'number' ? n : 0, before))} vs previous</span>` : ''}</div>`;
    const avg = (v) => (v === null ? '—' : v);
    $('periodTiles').innerHTML =
      ptile('Reports in Period', cur.reports, prev?.reports, `${cur.anonymous} anonymous`) +
      ptile('Being Handled', cur.inProgress, prev?.inProgress, `${cur.pending} still pending review`) +
      ptile('Resolved', cur.resolved, prev?.resolved, cur.reports ? `${Math.round(cur.resolved / cur.reports * 100)}% of the reports` : 'No reports') +
      ptile('Rejected', cur.rejected, prev?.rejected, 'Not accepted, with a reason') +
      `<div class="tile period"><span class="t">Average Days to Resolve</span><span class="n">${avg(cur.avgDaysToResolve)}</span>
        <span class="sub">From submission to Resolved</span>${prev ? `<span class="delta">Previous period: ${avg(prev.avgDaysToResolve)}</span>` : ''}</div>` +
      ptile('SOS Alerts', cur.sos, prev?.sos, 'Not affected by the filters');

    drawTrend(s);
    const bars = (id, rows, name = (k) => k) => {
      const box = $(id);
      const shown = rows.filter((r) => r[1] || r[2]);
      if (!shown.length) { box.innerHTML = '<p class="muted small">No reports in this period.</p>'; return; }
      const max = Math.max(1, ...shown.map((r) => Math.max(r[1], r[2] || 0)));
      box.innerHTML = shown.slice(0, 10).map(([k, n, before]) => {
        const label = name(k);
        const tip = `${label}: ${plural(n, 'report')}` + (p.compare ? ` · previous period: ${before}` : '');
        return `<div class="bar-row${p.compare ? ' with-prev' : ''}" title="${LIA.esc(tip)}">
          <span>${LIA.esc(label)}</span>
          <span class="track"><span class="fill" style="width:${(n / max) * 100}%"></span>${p.compare ? `<span class="fill prev" style="width:${(before / max) * 100}%"></span>` : ''}</span>
          <b>${n}${p.compare ? `<small>was ${before}</small>` : ''}</b></div>`;
      }).join('') + (shown.length > 10 ? `<p class="muted small">${shown.length - 10} more not shown (see Print Summary).</p>` : '');
    };
    bars('byLocation', s.byLocation);
    bars('byCategory', s.byCategory);
    bars('byGrade', s.byGrade);
    bars('byRole', s.byRole, ROLE_NAME);
    bars('byStatus', s.byStatus, STATUS_NAME);
    bars('byWeekday', s.byWeekday, WEEKDAY);

    $('recentSos').innerHTML = s.recentSos.length ? `
      <table class="plain">
        <thead><tr><th>When</th><th>Where</th><th>Status</th></tr></thead>
        <tbody>${s.recentSos.map((a) => `
          <tr><td>${LIA.esc(LIA.fmtDateTime(a.sentAt))}</td><td>${LIA.esc(a.location)}</td>
          <td><span class="chip ${a.status === 'Active' ? 'sos' : a.status === 'Dispatched' ? 'active' : 'resolved'}">${LIA.esc(a.status)}</span></td></tr>`).join('')}
        </tbody>
      </table>` : '<p class="muted small" style="margin:0">No SOS alerts yet.</p>';
  }

  // Bars per day, month or year. When comparing, a second (orange) bar shows the previous period.
  function drawTrend(s) {
    const p = s.period, rows = s.trend;
    $('trendTitle').textContent = { day: 'Daily', month: 'Monthly', year: 'Yearly' }[p.group] + ' Incident Trends';
    const total = rows.reduce((a, r) => a + r.n, 0);
    $('trendSub').textContent = `${plural(total, 'report')} in ${plural(rows.length, { day: 'day', month: 'month', year: 'year' }[p.group])}`;
    $('trendLegend').hidden = !p.compare;
    const max = Math.max(1, ...rows.map((r) => Math.max(r.n, r.prev || 0)));
    const many = rows.length > 16;           // many bars: numbers only when you point at a bar
    const every = Math.ceil(rows.length / 16); // and only every few labels under the bars
    const box = $('trend');
    box.classList.toggle('dense', many);
    box.style.minWidth = rows.length > 40 ? `${rows.length * 14}px` : '';
    box.innerHTML = rows.map((r, i) => {
      const tip = `${bucketLabel(r.key, p.group, true)}: ${plural(r.n, 'report')}`
        + (p.compare ? ` · ${bucketLabel(r.prevKey, p.group, true)}: ${plural(r.prev, 'report')}` : '');
      const showLabel = i % every === 0;
      return `<div class="col${p.compare ? ' pair' : ''}" title="${LIA.esc(tip)}">
        <span class="v">${many ? '' : r.n}</span>
        <span class="sticks">${p.compare ? `<span class="stick prev" style="height:${(r.prev / max) * 100}%"></span>` : ''}<span class="stick" style="height:${(r.n / max) * 100}%"></span></span>
        <span class="m">${showLabel ? LIA.esc(bucketLabel(r.key, p.group)) : ''}</span></div>`;
    }).join('');
  }

  // Filter choices (sorted A to Z; "Other" and "Not given" last)
  function fillFilters(o) {
    const atEnd = (k) => (k === 'Other' ? 1 : k === 'Not given' ? 2 : 0);
    const sorted = (list) => [...new Set(list)].sort((a, b) => atEnd(a) - atEnd(b) || a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }));
    const opt = (value, label) => `<option value="${LIA.esc(value)}">${LIA.esc(label)}</option>`;
    $('fGrade').insertAdjacentHTML('beforeend', o.grades.map((g) => opt(g, 'Grade ' + g)).join('') + opt('none', 'Not given'));
    $('fCategory').insertAdjacentHTML('beforeend', sorted(o.categories).map((c) => opt(c, c === 'Other' ? 'Others' : c)).join(''));
    $('fLocation').insertAdjacentHTML('beforeend', sorted(o.locations).map((c) => opt(c, c === 'Other' ? 'Others' : c)).join(''));
    $('fStatus').insertAdjacentHTML('beforeend', o.statuses.map((x) => opt(x, STATUS_NAME(x))).join(''));
    $('fRole').insertAdjacentHTML('beforeend', o.roles.map((x) => opt(x, ROLE_NAME(x))).join('') + opt('none', 'Not given (older report)'));
    Object.entries(FILTERS).forEach(([k, id]) => { $(id).value = state[k]; if ($(id).value !== state[k]) state[k] = ''; });
    filtersFilled = true;
  }

  // ---------- Changing the choices ----------
  const update = () => { saveState(); render(); };
  document.querySelectorAll('[data-group]').forEach((b) => b.addEventListener('click', () => {
    if (state.group === b.dataset.group) return;
    state.group = b.dataset.group;
    if (state.range !== 'custom') state.range = DEFAULT_RANGE[state.group];
    fillRanges();
    update();
  }));
  $('fRange').addEventListener('change', () => {
    state.range = $('fRange').value;
    if (state.range === 'custom') {
      // start the custom dates from the period that was showing
      const [from, to] = last ? [last.period.from, last.period.to] : [addDays(today, -29), today];
      state.from = from; state.to = to; $('fFrom').value = from; $('fTo').value = to;
    }
    fillRanges();
    update();
  });
  ['fFrom', 'fTo'].forEach((id) => {
    $(id).max = today;
    $(id).addEventListener('change', () => {
      if (!$('fFrom').value || !$('fTo').value) return;
      if ($('fFrom').value > $('fTo').value) return LIA.toast('The start date must be on or before the end date.', 'error');
      state.from = $('fFrom').value; state.to = $('fTo').value;
      update();
    });
  });
  $('fCompare').addEventListener('change', () => { state.compare = $('fCompare').checked; update(); });
  Object.entries(FILTERS).forEach(([k, id]) => $(id).addEventListener('change', () => { state[k] = $(id).value; update(); }));
  $('resetFilters').addEventListener('click', () => {
    Object.entries(FILTERS).forEach(([k, id]) => { state[k] = ''; $(id).value = ''; });
    state.group = 'month'; state.range = DEFAULT_RANGE.month; state.compare = false; $('fCompare').checked = false;
    fillRanges();
    update();
  });

  // ---------- Print Summary: every number of the charts as one table ----------
  $('printSummary').addEventListener('click', () => {
    if (!last) return;
    const s = last, p = s.period, cmp = p.compare;
    const rows = [];
    // The PDF font has no arrow signs, so the change is written in words: "Up 3 (+25%)"
    const words = (n, before) => change(n, before).replace('▲', 'Up').replace('▼', 'Down').replace('−', '-');
    const add = (section, item, n, before) => rows.push(cmp ? [section, item, String(n), String(before ?? ''), words(Number(n) || 0, before)] : [section, item, String(n)]);
    const cur = s.summary.current, prev = s.summary.previous || {};
    // The filters used, first (the subtitle only has room for the dates)
    const blank = cmp ? ['', '', ''] : [''];
    const filters = activeFilters();
    rows.push(['Filters', filters.length ? filters.join(', ') : 'None (all reports)', ...blank]);
    add('Summary', 'Reports in period', cur.reports, prev.reports);
    add('Summary', 'Anonymous reports', cur.anonymous, prev.anonymous);
    add('Summary', 'Pending review', cur.pending, prev.pending);
    add('Summary', 'Being handled', cur.inProgress, prev.inProgress);
    add('Summary', 'Resolved', cur.resolved, prev.resolved);
    add('Summary', 'Rejected', cur.rejected, prev.rejected);
    rows.push(cmp ? ['Summary', 'Average days to resolve', String(cur.avgDaysToResolve ?? '—'), String(prev.avgDaysToResolve ?? '—'), ''] : ['Summary', 'Average days to resolve', String(cur.avgDaysToResolve ?? '—')]);
    add('Summary', 'SOS alerts (not filtered)', cur.sos, prev.sos);
    const trendName = { day: 'Per day', month: 'Per month', year: 'Per year' }[p.group];
    s.trend.forEach((r) => add(trendName, bucketLabel(r.key, p.group, true), r.n, r.prev));
    [['Location', s.byLocation], ['Category', s.byCategory], ['Grade level', s.byGrade], ['Reporter type', s.byRole, ROLE_NAME],
      ['Status', s.byStatus, STATUS_NAME], ['Day of the week (incident)', s.byWeekday, WEEKDAY]].forEach(([section, list, name = (k) => k]) => {
      list.filter((r) => r[1] || r[2]).forEach(([k, n, before]) => add(section, name(k), n, before));
    });
    PRINT.choose({
      title: 'Dashboard Summary',
      subtitle: `Reports submitted ${longDate(p.from)} to ${longDate(p.to)}` + (cmp ? ` · Previous period: ${longDate(p.prevFrom)} to ${longDate(p.prevTo)}` : ''),
      columns: cmp
        ? [{ label: 'Section', width: 110 }, { label: 'Item' }, { label: 'This Period', width: 70 }, { label: 'Previous Period', width: 80 }, { label: 'Change', width: 90 }]
        : [{ label: 'Section', width: 130 }, { label: 'Item' }, { label: 'Reports', width: 80 }],
      sets: [{ label: `All numbers (${rows.length} rows)`, rows }],
      filename: `dashboard-summary-${p.from}-to-${p.to}`,
      landscape: false,
    });
  });

  fillRanges();
  if (state.range === 'custom') { $('fFrom').value = state.from; $('fTo').value = state.to; }
  $('fCompare').checked = state.compare;
  await render();
  document.addEventListener('lia:new-sos', render);
  setInterval(render, 60000);
})();
