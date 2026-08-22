const localDatabase = {
    reportsKey: 'lagroInActionReports',
    messagesKey: 'lagroInActionMessages',
    sosKey: 'lagroInActionSosAlerts',

    read(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (error) {
            return [];
        }
    },

    write(key, records) {
        localStorage.setItem(key, JSON.stringify(records));
    },

    addReport(report) {
        const reports = this.read(this.reportsKey);
        reports.unshift({ ...report, id: report.id || `REP-${Date.now()}`, createdAt: new Date().toISOString() });
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
