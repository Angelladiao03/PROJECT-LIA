function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function loadDashboardData() {
    const reports = localDatabase.read(localDatabase.reportsKey);
    const registrations = JSON.parse(localStorage.getItem('lagroInActionRegisteredStudents') || '[]');
    const alerts = localDatabase.read(localDatabase.sosKey);
    const counts = {
        registrationCount: registrations.length,
        totalReportsCount: reports.length,
        pendingReportsCount: reports.filter(report => report.status === 'requested' || report.status === 'pending').length,
        investigationReportsCount: reports.filter(report => report.status === 'submitted' || report.status === 'investigation').length,
        resolvedReportsCount: reports.filter(report => report.status === 'resolved').length
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
    alerts.slice(0, 5).forEach(alert => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${new Date(alert.createdAt).toLocaleString()}</td><td>${alert.lrn} (${alert.username})</td><td>${alert.location}</td><td>${alert.description || 'No description provided.'}</td><td><span class="badge badge-danger">${alert.status}</span></td>`;
        sosBody.appendChild(row);
    });
}

function renderCharts() {
    if (typeof Chart === 'undefined') return;
    const reports = localDatabase.read(localDatabase.reportsKey);
    const categories = [...new Set(reports.map(report => report.category))];
    const categoryCounts = categories.map(category => reports.filter(report => report.category === category).length);
    const trends = Array.from({ length: 6 }, (_, index) => {
        const month = new Date().getMonth() - (5 - index);
        return reports.filter(report => new Date(report.createdAt).getMonth() === (month + 12) % 12).length;
    });

    new Chart(document.getElementById('trendsChart'), {
        type: 'line',
        data: { labels: ['-5', '-4', '-3', '-2', '-1', 'Current'], datasets: [{ label: 'Reports', data: trends, borderColor: '#1b5e20', backgroundColor: 'rgba(27, 94, 32, 0.1)', fill: true, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: { labels: categories.length ? categories : ['No reports'], datasets: [{ data: categoryCounts.length ? categoryCounts : [1], backgroundColor: ['#1b5e20', '#ff6b6b', '#e59819', '#2196f3', '#9e9e9e'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

loadDashboardData();
renderCharts();
