(function enforceAdminAccess() {
    let activeUser = null;
    try {
        activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    } catch (error) {
        activeUser = null;
    }

    if (!activeUser || activeUser.role !== 'admin') {
        window.location.replace('../../index.html');
    }
})();