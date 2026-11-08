// Submit Report form.

(async () => {
  const me = await LIA.start();
  const acct = me.account;
  const isGuest = acct.accountType === 'guest';
  const form = document.getElementById('reportForm');

  // "Is this related to one of your earlier resolved reports?": only for reports that include the
  // student's identity, and only their earlier Resolved reports that also included it (linking to an
  // anonymous report would reveal who sent it). Guests' reports are always anonymous, so guests never see it.
  // A closed chat's "Submit a Related Report" button opens this page with ?related=<reportNo>.
  let earlier = [];
  if (!isGuest) {
    try {
      ({ reports: earlier } = await LIA.api('reports/mine.php'));
      earlier = earlier.filter((r) => !r.anonymous && r.status === 'Resolved');
      form.relatedReport.insertAdjacentHTML('beforeend', earlier.map((r) =>
        `<option value="${r.reportNo}">${LIA.esc(LIA.caseNo(r))} · ${LIA.esc(r.category)} · ${LIA.esc(LIA.fmtDate(r.submittedAt))}</option>`).join(''));
    } catch (e) { /* the question is optional; the form works without it */ }
  }
  const wanted = new URLSearchParams(location.search).get('related');
  const wantedOk = wanted && earlier.some((r) => String(r.reportNo) === wanted);

  // Submission preference: students choose, guests are always anonymous
  document.getElementById('anonStudent').hidden = isGuest;
  document.getElementById('anonGuest').hidden = !isGuest;
  const askGrade = !acct.gradeLevel; // guests (students already have a grade level)
  document.getElementById('gradeField').hidden = !askGrade;
  if (!isGuest) {
    document.getElementById('idName').value = acct.fullName || '';
    document.getElementById('idGrade').value = acct.gradeSection || '';
    const updatePref = () => {
      const identity = form.submitAs.value === 'identity';
      document.getElementById('identityFields').hidden = !identity;
      document.getElementById('prefNote').textContent = identity
        ? 'Guidance staff will see your name and details so that they may contact you regarding this report.'
        : 'Note: Guidance staff will not see your name, only your mobile number, so that they may contact you if necessary. The report will still appear in your My Report History so that you can monitor it.';
      document.getElementById('relatedField').hidden = !identity || !earlier.length;
      if (!identity) form.relatedReport.value = ''; // an anonymous report is never linked
    };
    form.querySelectorAll('[name=submitAs]').forEach((r) => r.addEventListener('change', updatePref));
    // Coming from "Submit a Related Report": the earlier report included the student's identity, so this one does too
    if (wantedOk) form.querySelector('[name=submitAs][value=identity]').checked = true;
    updatePref();
    if (wantedOk) form.relatedReport.value = wanted;
  }

  // Location choices come from /assets/locations.json
  await LIA.fillLocations(form.location);

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
    if (askGrade && !form.gradeLevel.value) return 'Choose your grade level.';
    if (!form.reporterRole.value) return 'Choose who you are in this incident: bullied, witness, or other.';
    if (!form.category.value) return 'Select the category of bullying.';
    if (form.category.value === 'Other' && !form.categoryOther.value.trim()) return 'Please specify the category.';
    if (!form.location.value) return 'Select where it happened.';
    if (form.location.value === 'Other' && !form.locationOther.value.trim()) return 'Please specify the location.';
    if (!form.incidentDate.value) return 'Choose the date it happened.';
    if (form.incidentDate.value > today) return 'The date cannot be in the future.';
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
      document.getElementById('sentTitle').textContent = `Report #${res.caseId} submitted`;
      document.getElementById('sentCard').hidden = false;
      window.scrollTo({ top: 0 });
    } catch (err) { LIA.showFormError(form, err.message); }
  });
})();
