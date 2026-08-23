// Sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('closed');
}

// Handle SOS Emergency Form Submission
function handleSosSubmit(e) {
    e.preventDefault();
    const location = document.getElementById('sosLocation').value;
    const description = document.getElementById('sosDescription').value;
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    localDatabase.addSos({ username: activeUser?.username || 'Anonymous student', lrn: activeUser?.lrn || 'Anonymous', location, description, status: 'UNVERIFIED' });

    showPagePopup(`Location: ${location}. Details: ${description || 'None provided'}. Guidance Counselor has been alerted immediately.`, 'SOS Sent');
    
    closeSosModal();
}

// ================= REPORT FORM LOGIC ================= //

// Toggle Full Name & Grade/Section fields depending on Anonymity radio selection
function toggleAnonymityFields() {
    const isAnonymous = document.querySelector('input[name="anonymity"]:checked').value === 'anonymous';
    const personalFields = document.getElementById('personalInfoFields');
    const nameInput = document.getElementById('fullName');
    const gradeInput = document.getElementById('gradeSection');

    if (isAnonymous) {
        personalFields.classList.add('hidden');
        nameInput.removeAttribute('required');
        gradeInput.removeAttribute('required');
        nameInput.value = '';
        gradeInput.value = '';
    } else {
        personalFields.classList.remove('hidden');
        nameInput.setAttribute('required', 'true');
        gradeInput.setAttribute('required', 'true');
    }
}

// Toggle "Specify Others" input if user chooses "Others" in Category
function toggleOthersField() {
    const categorySelect = document.getElementById('category');
    const othersContainer = document.getElementById('othersContainer');
    const otherCategoryInput = document.getElementById('otherCategory');

    if (categorySelect.value === 'Others') {
        othersContainer.classList.remove('hidden');
        otherCategoryInput.setAttribute('required', 'true');
    } else {
        othersContainer.classList.add('hidden');
        otherCategoryInput.removeAttribute('required');
        otherCategoryInput.value = '';
    }
}

// Clear custom dynamic fields when clicking the Reset button
function resetCustomFields() {
    setTimeout(() => {
        toggleAnonymityFields();
        toggleOthersField();
    }, 10);
}

// Handle Incident Report Form Submission
function handleReportSubmit(e) {
    e.preventDefault();
    
    const isAnonymous = document.querySelector('input[name="anonymity"]:checked').value === 'anonymous';
    const category = document.getElementById('category').value;
    const specifiedCategory = document.getElementById('otherCategory').value;
    const location = document.getElementById('location').value;
    const date = document.getElementById('incidentDateTime').value;
    const description = document.getElementById('description').value.trim();
    const activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
    window.showPageLoading?.('Sending report...');
    setTimeout(() => {
    localDatabase.addReport({ username: isAnonymous ? 'Anonymous' : (activeUser?.username || document.getElementById('fullName').value.trim()), fullName: isAnonymous ? 'Anonymous Student' : document.getElementById('fullName').value.trim(), lrn: isAnonymous ? 'Anonymous' : (activeUser?.lrn || ''), gradeSection: isAnonymous ? '' : document.getElementById('gradeSection').value.trim(), category: category === 'Others' ? `Others (${specifiedCategory})` : category, location, dateTime: date, description, status: 'requested' });
    
    const finalCategory = category === 'Others' ? `Others (${specifiedCategory})` : category;

    let alertMessage = `REPORT SUBMITTED SUCCESSFULLY!\n\n` +
                       `Type: ${isAnonymous ? 'Anonymous' : 'Non-Anonymous'}\n`;

    if (!isAnonymous) {
        const name = document.getElementById('fullName').value;
        const gradeSection = document.getElementById('gradeSection').value;
        alertMessage += `Reporter: ${name} (${gradeSection})\n`;
    }

    alertMessage += `Category: ${finalCategory}\n` +
                   `Location: ${location}\n` +
                   `Date: ${date}\n\n` +
                   `Your report has been received by the Guidance Office.` +
                   (isAnonymous ? ' Because this report is anonymous, it will be deleted after the case is resolved so your data will not be stored.' : '');

    window.hidePageLoading?.();
    showPagePopup(alertMessage.replaceAll('\n', ' '), 'Report Submitted', () => {
        document.getElementById('reportForm').reset();
        resetCustomFields();
    });
    }, 350);
}