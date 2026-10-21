// Report form.

(async () => {
  const me = await LIA.start();
  const isGuest = me.account.accountType === 'guest';
  const form = document.getElementById('reportForm');

  document.getElementById('anonStudent').hidden = isGuest;
  document.getElementById('anonGuest').hidden = !isGuest;

  // Date: today by default, no future dates
  const today = LIA.todayInManila();
  form.incidentDate.max = today;
  form.incidentDate.value = today;

  // Show the extra fields only when needed
  const showWhen = (select, value, fieldId) => {
    const update = () => { document.getElementById(fieldId).hidden = select.value !== value; };
    select.addEventListener('change', update);
    update();
  };
  showWhen(form.category, 'Other', 'categoryOtherField');
  showWhen(form.location, 'Other', 'locationOtherField');
  form.querySelectorAll('[name=involvedKnown]').forEach((r) => r.addEventListener('change', () => {
    document.getElementById('involvedField').hidden = form.involvedKnown.value !== 'yes';
  }));

  const count = document.getElementById('descCount');
  form.description.addEventListener('input', () => { count.textContent = `${form.description.value.length} / 5000`; });

  // Keep a draft in this browser in case the page is closed by accident
  const DRAFT = 'lia-report-draft';
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    if (draft && draft.description) {
      form.description.value = draft.description;
      count.textContent = `${draft.description.length} / 5000`;
    }
  } catch (e) {}
  form.description.addEventListener('input', () => {
    try { localStorage.setItem(DRAFT, JSON.stringify({ description: form.description.value })); } catch (e) {}
  });

  function check() {
    if (!form.reporterRole.value) return 'Choose who you are in this: bullied, witness, or other.';
    if (!form.category.value) return 'Choose what kind of bullying happened.';
    if (form.category.value === 'Other' && !form.categoryOther.value.trim()) return 'Describe the kind of bullying in a few words.';
    if (!form.location.value) return 'Choose where it happened.';
    if (form.location.value === 'Other' && !form.locationOther.value.trim()) return 'Type where it happened.';
    if (!form.incidentDate.value) return 'Choose the date it happened.';
    if (form.incidentDate.value > today) return "The date can't be in the future.";
    if (form.description.value.trim().length < 10) return 'Describe what happened (at least a sentence).';
    if (form.involvedKnown.value === 'yes' && !form.involvedDescription.value.trim()) return 'Describe the person or people involved.';
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const problem = check();
    if (problem) return LIA.showFormError(form, problem);
    const fd = new FormData(form);
    fd.set('anonymous', !isGuest && document.getElementById('anonymous').checked ? 'yes' : 'no');
    try {
      const res = await LIA.busy(form.querySelector('button[type=submit]'), () => LIA.api('reports/create.php', { body: fd }));
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      form.hidden = true;
      document.getElementById('sentTitle').textContent = `Report #${res.reportNo} sent`;
      document.getElementById('sentCard').hidden = false;
      window.scrollTo({ top: 0 });
    } catch (err) { LIA.showFormError(form, err.message); }
  });
})();
