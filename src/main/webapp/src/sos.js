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

// CHANGED: added "async" so we can use "await" with fetch() inside
async function handleSosSubmit(event) {
    event.preventDefault();
    const locationInput = document.getElementById('sosLocation');
    const descriptionInput = document.getElementById('sosDescription');

    window.showPageLoading?.('Sending SOS...');

    const params = new URLSearchParams({
        location: locationInput?.value || '',
        description: descriptionInput?.value || ''
    });

    try {
        const res = await fetch('../../../SosServlet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        const data = await res.json();

        window.hidePageLoading?.();

        if (!data.success) {
            showPagePopup(data.message, 'Could Not Send SOS');
            return;
        }

        showPagePopup('The guidance office has been notified immediately.', 'SOS Dispatched');
        if (locationInput) locationInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        closeSosModal();

    } catch (error) {
        window.hidePageLoading?.();
        showPagePopup('Could not reach the server. Please try again.', 'Connection Error');
    }
}