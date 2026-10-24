// Submit Report form.

(async () => {
  const me = await LIA.start();
  const acct = me.account;
  const isGuest = acct.accountType === 'guest';
  const form = document.getElementById('reportForm');

  // Submission preference: students choose, guests are always anonymous
  document.getElementById('anonStudent').hidden = isGuest;
  document.getElementById('anonGuest').hidden = !isGuest;
  if (!isGuest) {
    document.getElementById('idName').value = acct.fullName || '';
    document.getElementById('idGrade').value = acct.gradeSection || '';
    const updatePref = () => {
      const identity = form.submitAs.value === 'identity';
      document.getElementById('identityFields').hidden = !identity;
      document.getElementById('prefNote').textContent = identity
        ? 'Guidance staff will see your name and details, so they can message you about this report.'
        : "Reminder: guidance staff will not see your name. The report still appears in your My Report History so you can follow it. Staff can't message you about it, so message them yourself if you want to talk.";
    };
    form.querySelectorAll('[name=submitAs]').forEach((r) => r.addEventListener('change', updatePref));
    updatePref();
  }

  // Date: today by default, no future dates
  const today = LIA.todayInManila();
  form.incidentDate.max = today;
  form.incidentDate.value = today;

  // Show extra fields only when needed
  const showWhen = (select, value, fieldId) => {
    const update = () => { document.getElementById(fieldId).hidden = select.value !== value; };
    select.addEventListener('change', update);
    update();
    return update;
  };
  const refresh = [
    showWhen(form.category, 'Other', 'categoryOtherField'),
    showWhen(form.location, 'Other', 'locationOtherField'),
    showWhen(form.involvedKnown, 'yes', 'involvedField'),
  ];

  const count = document.getElementById('descCount');
  const updateCount = () => { count.textContent = `${form.description.value.length} / 5000`; };
  form.description.addEventListener('input', updateCount);

  // Keep a draft of the description in this browser in case the page is closed by accident
  const DRAFT = 'lia-report-draft';
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    if (draft && draft.description) { form.description.value = draft.description; updateCount(); }
  } catch (e) {}
  form.description.addEventListener('input', () => {
    try { localStorage.setItem(DRAFT, JSON.stringify({ description: form.description.value })); } catch (e) {}
  });

  form.addEventListener('reset', () => {
    setTimeout(() => {
      form.incidentDate.value = today;
      refresh.forEach((f) => f());
      updateCount();
      LIA.showFormError(form, '');
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      if (!isGuest) form.querySelector('[name=submitAs][value=anonymous]').dispatchEvent(new Event('change'));
    });
  });

  function check() {
    if (!form.reporterRole.value) return 'Choose who you are in this incident: bullied, witness, or other.';
    if (!form.category.value) return 'Select the category of bullying.';
    if (form.category.value === 'Other' && !form.categoryOther.value.trim()) return 'Please specify the category.';
    if (!form.location.value) return 'Select where it happened.';
    if (form.location.value === 'Other' && !form.locationOther.value.trim()) return 'Please specify the location.';
    if (!form.incidentDate.value) return 'Choose the date it happened.';
    if (form.incidentDate.value > today) return "The date can't be in the future.";
    if (!form.involvedKnown.value) return 'Answer: do you know the person(s) involved?';
    if (form.involvedKnown.value === 'yes' && !form.involvedDescription.value.trim()) return 'Describe the person(s) involved.';
    if (form.description.value.trim().length < 10) return 'Describe what happened (at least a sentence).';
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const problem = check();
    if (problem) return LIA.showFormError(form, problem);
    const fd = new FormData(form);
    fd.set('anonymous', !isGuest && form.submitAs.value === 'identity' ? 'no' : 'yes');
    try {
      const res = await LIA.busy(form.querySelector('button[type=submit]'), () => LIA.api('reports/create.php', { body: fd }));
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      form.hidden = true;
      document.getElementById('sentTitle').textContent = `Report #${res.reportNo} submitted`;
      document.getElementById('sentCard').hidden = false;
      window.scrollTo({ top: 0 });
    } catch (err) { LIA.showFormError(form, err.message); }
  });
})();
