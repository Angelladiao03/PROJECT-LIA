// Staff dashboard (Guidance Counselor and Principal): totals, monthly bars, where and what kind of bullying.
// Uses admin/stats.php, which only sends numbers (no names or case details).

(async () => {
  const me = await LIA.start();
  const counselor = me.account.role === 'counselor'; // the principal sees the same numbers, without links to cases
  document.getElementById('signedInAs').textContent = `Signed in as ${me.account.displayName} · ${me.account.roleLabel}`;
  document.getElementById('sosLink').hidden = !counselor;

  async function render() {
    let s;
    try { s = await LIA.api('admin/stats.php'); } catch (e) {
      document.getElementById('tiles').innerHTML = `<div class="empty"><strong>Couldn't load the dashboard</strong><span>${LIA.esc(e.message)}</span></div>`;
      return;
    }

    // Number tiles. Only "Active SOS" turns red, and only when there is one.
    const t = s.tiles;
    const tile = (n, label, sub, href, alert = false) => {
      const inner = `<span class="t">${label}</span><span class="n">${n}</span><span class="sub">${sub}</span>`;
      return counselor ? `<a class="tile ${alert && n ? 'alert' : ''}" href="${href}">${inner}</a>` : `<div class="tile ${alert && n ? 'alert' : ''}">${inner}</div>`;
    };
    document.getElementById('tiles').innerHTML =
      tile(t.activeSos, 'Active SOS', 'Needs response now', '/admin/cases.html#sos', true) +
      (t.pendingAccounts !== null ? tile(t.pendingAccounts, 'Registration Requests', 'Waiting for approval', '/admin/accounts.html') : '') +
      tile(t.total, 'Total Reports', 'All reports received', '/admin/records.html') +
      tile(t.pending, 'Pending Review', 'New, not yet reviewed', '/admin/cases.html') +
      tile(t.investigating, 'Being Handled', 'Accepted or under investigation', '/admin/cases.html') +
      tile(t.resolved, 'Resolved', 'Cases closed', '/admin/records.html');

    // Reports per month: plain bars (each bar is a real count)
    const maxM = Math.max(1, ...s.monthly.map((m) => m.n));
    document.getElementById('monthly').innerHTML = s.monthly.map((m) => {
      const label = new Date(m.month + '-01T00:00:00+08:00').toLocaleDateString('en-PH', { month: 'short', timeZone: 'Asia/Manila' });
      return `<div class="col" title="${m.n} ${m.n === 1 ? 'report' : 'reports'} in ${label}">
        <span class="v">${m.n}</span><span class="stick" style="height:${(m.n / maxM) * 100}%"></span><span class="m">${label}</span></div>`;
    }).join('');

    const bars = (id, rows, name = (k) => k) => {
      const box = document.getElementById(id);
      if (!rows.length) { box.innerHTML = '<p class="muted small">No reports yet.</p>'; return; }
      const max = Math.max(...rows.map((r) => r[1]));
      box.innerHTML = rows.slice(0, 8).map(([k, n]) => `
        <div class="bar-row"><span>${LIA.esc(name(k))}</span><span class="track"><span class="fill" style="width:${(n / max) * 100}%"></span></span><b>${n}</b></div>`).join('');
    };
    bars('byLocation', s.byLocation);
    bars('byCategory', s.byCategory);
    bars('byGrade', s.byGrade);
    bars('byRole', s.byRole, (k) => LIA.ROLE[k] || 'Not given (older report)');

    document.getElementById('recentSos').innerHTML = s.recentSos.length ? `
      <table class="plain">
        <thead><tr><th>When</th><th>Where</th><th>Status</th></tr></thead>
        <tbody>${s.recentSos.map((a) => `
          <tr><td>${LIA.esc(LIA.fmtDateTime(a.sentAt))}</td><td>${LIA.esc(a.location)}</td>
          <td><span class="chip ${a.status === 'Active' ? 'sos' : a.status === 'Dispatched' ? 'active' : 'resolved'}">${LIA.esc(a.status)}</span></td></tr>`).join('')}
        </tbody>
      </table>` : '<p class="muted small" style="margin:0">No SOS alerts yet.</p>';
  }

  await render();
  document.addEventListener('lia:new-sos', render);
  setInterval(render, 60000);
})();
