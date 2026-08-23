function openSosModal() {
    window.closeAllSidebars?.();
    const modal = document.getElementById('sosModal');
    modal?.classList.remove('hidden', 'closing');
}

function closeSosModal() {
    const modal = document.getElementById('sosModal');
    if (!modal || modal.classList.contains('hidden') || modal.classList.contains('closing')) return;
    modal.classList.add('closing');
    window.setTimeout(() => {
        modal.classList.remove('closing');
        modal.classList.add('hidden');
    }, 200);
}

function handleSosSubmit(event) {
    event.preventDefault();
    const locationInput = document.getElementById('sosLocation');
    const descriptionInput = document.getElementById('sosDescription');
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');

    window.showPageLoading?.('Sending SOS...');
    setTimeout(() => {
        localDatabase.addSos({
            username: activeUser?.username || 'Anonymous student',
            lrn: activeUser?.lrn || 'Anonymous',
            location: locationInput?.value || '',
            description: descriptionInput?.value || '',
            status: 'UNVERIFIED'
        });
        window.hidePageLoading?.();
        showPagePopup('The guidance office has been notified immediately.', 'SOS Dispatched');
        if (locationInput) locationInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        closeSosModal();
    }, 350);
}
