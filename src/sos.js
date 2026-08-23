function openSosModal() {
    window.closeAllSidebars?.();
    document.getElementById('sosModal')?.classList.remove('hidden');
}

function closeSosModal() {
    document.getElementById('sosModal')?.classList.add('hidden');
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
