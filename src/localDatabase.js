const localDatabase = {
    reportsKey: 'lagroInActionReports',
    messagesKey: 'lagroInActionMessages',
    sosKey: 'lagroInActionSosAlerts',

    read(key) {
        try {
            const records = JSON.parse(localStorage.getItem(key)) || [];
            if (key === this.sosKey) {
                const cutoff = new Date();
                cutoff.setMonth(cutoff.getMonth() - 1);
                const recentAlerts = records.filter(alert => new Date(alert.createdAt) >= cutoff);
                if (recentAlerts.length !== records.length) this.write(key, recentAlerts);
                return recentAlerts;
            }
            return records;
        } catch (error) {
            return [];
        }
    },

    write(key, records) {
        localStorage.setItem(key, JSON.stringify(records));
    },

    addReport(report) {
        const reports = this.read(this.reportsKey);
        const now = new Date();
        const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
        const academicYear = `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
        const nextNumber = reports.reduce((highest, item) => {
            const match = String(item.id || '').match(new RegExp(`^REP-${academicYear}-(\\d+)$`));
            return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0) + 1;
        const id = report.id || `REP-${academicYear}-${String(nextNumber).padStart(5, '0')}`;
        reports.unshift({ ...report, id, createdAt: report.createdAt || now.toISOString() });
        this.write(this.reportsKey, reports);
        return reports[0];
    },

    addMessage(message) {
        const messages = this.read(this.messagesKey);
        messages.push({ ...message, senderName: message.senderName || (message.sender === 'admin' ? 'Guidance Admin' : 'Student'), id: `MSG-${Date.now()}`, createdAt: new Date().toISOString() });
        this.write(this.messagesKey, messages);
        return messages[messages.length - 1];
    },

    addSos(alert) {
        const alerts = this.read(this.sosKey);
        const record = { ...alert, id: alert.id || `SOS-${Date.now()}`, createdAt: alert.createdAt || new Date().toISOString() };
        alerts.unshift(record);
        this.write(this.sosKey, alerts);
        return record;
    },

    getMessages(username) {
        return this.read(this.messagesKey).filter(message => !username || message.username === username);
    }
};
