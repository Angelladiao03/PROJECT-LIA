function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

let cachedDashboardReports = [];

async function loadDashboardData() {
    let reports = [];
    let alerts = [];
    let pending = [];
    try {
        const [reportsRes, alertsRes, pendingRes] = await Promise.all([
            fetch('../../../AdminReportServlet'),
            fetch('../../../AdminReportServlet?type=sos'),
            fetch('../../../AdminRequestServlet')
        ]);
        if (!reportsRes.ok || !alertsRes.ok || !pendingRes.ok) {
            throw new Error('Failed to load dashboard data.');
        }
        reports = await reportsRes.json();
        alerts = await alertsRes.json();
        pending = await pendingRes.json();
    } catch (err) {
        // fall through with empty arrays so the page still renders
    }
    cachedDashboardReports = reports;

    const counts = {
        registrationCount: pending.length,
        totalReportsCount: reports.length,
        pendingReportsCount: reports.filter(report => report.status === 'Pending').length,
        investigationReportsCount: reports.filter(report => report.status === 'Active' || report.status === 'Under Investigation').length,
        resolvedReportsCount: reports.filter(report => report.status === 'Resolved').length
    };

    Object.entries(counts).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    const sosBody = document.getElementById('dashboardSosBody');
    sosBody.innerHTML = '';
    if (!alerts.length) {
        sosBody.innerHTML = '<tr class="empty-record-row"><td colspan="5">No emergency SOS cases found.</td></tr>';
    }
    alerts.slice(0, 5).forEach(alertData => {
        const row = document.createElement('tr');
        const status = alertData.status || 'Active';
        const lrn = alertData.lrn || 'N/A';
        const reporter = alertData.username || alertData.fullName || 'Anonymous';
        const badgeClass = status === 'Responded' ? 'badge-success' : (status === 'Dispatched' ? 'badge-warning' : 'badge-danger');
        row.innerHTML = `<td>${alertData.dateTime}</td><td>${lrn} (${reporter})</td><td>${alertData.location}</td><td>${alertData.description || 'No description provided.'}</td><td><span class="badge ${badgeClass}">${status}</span></td>`;
        sosBody.appendChild(row);
    });

    renderCharts(reports);
}

function renderCharts(reports) {
    if (typeof Chart === 'undefined') return;
    const categories = [...new Set(reports.map(report => report.category))];
    const categoryCounts = categories.map(category => reports.filter(report => report.category === category).length);

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const trends = monthLabels.map((_, monthIndex) => reports.filter(report => {
        const reportDate = new Date(report.dateTime);
        return reportDate.getFullYear() === currentYear && reportDate.getMonth() === monthIndex;
    }).length);

    new Chart(document.getElementById('trendsChart'), {
        type: 'line',
        data: { labels: monthLabels, datasets: [{ label: `Reports (${currentYear})`, data: trends, borderColor: '#1b5e20', backgroundColor: 'rgba(27, 94, 32, 0.1)', fill: true, tension: 0.3 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });

    new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: { labels: categories.length ? categories : ['No reports'], datasets: [{ data: categoryCounts.length ? categoryCounts : [1], backgroundColor: ['#1b5e20', '#ff6b6b', '#e59819', '#2196f3', '#9e9e9e'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

loadDashboardData();
