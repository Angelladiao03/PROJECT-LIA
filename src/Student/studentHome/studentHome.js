// Sidebar Toggle Function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('closed');
    }
}

// SOS Modal Open / Close Functions
function openSosModal() {
    window.closeAllSidebars?.();
    const modal = document.getElementById('sosModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeSosModal() {
    const modal = document.getElementById('sosModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle SOS Emergency Form Submission
function handleSosSubmit(e) {
    e.preventDefault();
    const locationInput = document.getElementById('sosLocation');
    const descriptionInput = document.getElementById('sosDescription');

    const location = locationInput ? locationInput.value : '';
    const description = descriptionInput ? descriptionInput.value : '';
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    window.showPageLoading?.('Sending SOS...');
    setTimeout(() => {
        localDatabase.addSos({
        username: activeUser?.username || 'Anonymous student',
        lrn: activeUser?.lrn || 'Anonymous',
        location,
        description,
        status: 'UNVERIFIED'
        });
        window.hidePageLoading?.();

        showPagePopup(`Location: ${location}. Details: ${description || 'None provided'}. Guidance Counselor has been alerted immediately.`, 'SOS Sent');
    
    if (locationInput) locationInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
    }, 350);
    
    closeSosModal();
}