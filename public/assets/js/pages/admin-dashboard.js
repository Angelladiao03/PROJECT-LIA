// Staff dashboard: counts, monthly bars, hotspots, recent SOS.

(async () => {
  const me = await LIA.start();
  document.getElementById('signedInAs').textContent = 'Signed in as ' + me.account.displayName + '. Here is what needs attention, and where bullying is happening.';

  async function render() {
    let reports, alerts, pending;
    try {
      [{ reports }, { alerts }, { pending }] = await Promise.all([
        LIA.api('admin/reports.php'), LIA.api('admin/sos.php'), LIA.api('admin/activations.php'),
      ]);
    } catch (e) {
      document.getElementById('tiles').innerHTML = `<div class="empty"><strong>Couldn't load the dashboard</strong><span>${LIA.esc(e.message)}</span></div>`;
      return;
    }

    const count = (status) => reports.filter((r) => r.status === status && !r.archived).length;
    const activeSos = alerts.filter((a) => a.status === 'Active').length;
    const tile = (n, label, sub, href, color, alert = false) =>
      `<a class="tile ${color} ${alert && n ? 'alert' : ''}" href="${href}"><span class="t">${label}</span><span class="n">${n}</span><span>${sub}</span></a>`;
    document.getElementById('tiles').innerHTML =
      tile(activeSos, 'Active SOS', 'Needs response now', '/admin/sos.html', 'c-sos', true) +
      tile(count('Pending'), 'Pending review', 'New reports to check', '/admin/cases.html#new', 'c-yellow') +
      tile(count('Active'), 'Active cases', 'Accepted, being handled', '/admin/cases.html#active', 'c-blue') +
      tile(count('Under Investigation'), 'In investigation', 'Ongoing guidance sessions', '/admin/cases.html#investigating', 'c-orange') +
      tile(count('Resolved'), 'Resolved cases', 'Successfully addressed', '/admin/records.html', 'c-green') +
      tile(pending.length, 'Account requests', 'Waiting for approval', '/admin/accounts.html', '');

    // Reports per month (bars, not a curved line: each bar is a real count)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString('en-PH', { month: 'short' }), n: 0 });
    }
    reports.forEach((r) => {
      const d = LIA.toDate(r.submittedAt);
      if (!d) return;
      const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) m.n++;
    });
    const maxM = Math.max(1, ...months.map((m) => m.n));
    document.getElementById('monthly').innerHTML = months.map((m) => `
      <div class="col" title="${m.n} reports in ${m.label}">
        <span class="v">${m.n}</span>
        <span class="stick" style="height:${(m.n / maxM) * 100}%"></span>
        <span class="m">${m.label}</span>
      </div>`).join('');

    // Bar lists
    const tally = (pick) => {
      const map = new Map();
      reports.forEach((r) => { const k = pick(r); if (k) map.set(k, (map.get(k) || 0) + 1); });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    const bars = (el, rows, hotTop = false) => {
      const box = document.getElementById(el);
      if (!rows.length) { box.innerHTML = '<p class="muted small">No reports yet.</p>'; return; }
      const max = rows[0][1];
      box.innerHTML = rows.slice(0, 8).map(([k, n], i) => `
        <div class="bar-row ${hotTop && i === 0 ? 'hot' : ''}">
          <span>${LIA.esc(k)}</span><span class="track"><span class="fill" style="width:${(n / max) * 100}%;display:block"></span></span><b>${n}</b>
        </div>`).join('');
    };
    bars('byLocation', tally((r) => r.location.startsWith('Other: ') ? 'Other' : r.location), true);
    bars('byCategory', tally((r) => r.category.startsWith('Other: ') ? 'Other' : r.category));
    bars('byRole', tally((r) => LIA.ROLE[r.reporterRole] || 'Not given (older report)'));

    // Recent SOS
    const recent = alerts.slice(0, 5);
    document.getElementById('recentSos').innerHTML = recent.length ? `
      <table class="plain">
        <thead><tr><th>When</th><th>From</th><th>Where</th><th>What</th><th>Status</th></tr></thead>
        <tbody>${recent.map((a) => `
          <tr><td>${LIA.esc(LIA.fmtDateTime(a.sentAt))}</td><td>${LIA.esc(a.name)}</td><td>${LIA.esc(a.location)}</td>
          <td>${LIA.esc(a.description)}</td><td><span class="chip ${a.status === 'Active' ? 'sos' : a.status === 'Dispatched' ? 'active' : 'resolved'}">${LIA.esc(a.status)}</span></td></tr>`).join('')}
        </tbody>
      </table>` : '<p class="muted small" style="margin:0">No SOS alerts yet.</p>';
  }

  await render();
  document.addEventListener('lia:new-sos', render);
  setInterval(render, 60000);
})();
