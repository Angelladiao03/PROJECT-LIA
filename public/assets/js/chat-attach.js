// The "+" button at the left of the message box.
// Clicking it opens a small box above it with "Attach File" (and, for staff, "Attach Case").
// A chosen file shows as a chip above the message box until it's sent or removed.
//
//   const attach = ATTACH.setup({ form, onCase: () => {...} });   // onCase only on the staff page
//   attach.file   -> the chosen File, or null
//   attach.clear()
//   ATTACH.fileCard(m.file)  -> HTML for a file inside a message bubble

const ATTACH = (() => {
  const MAX_BYTES = 5 * 1024 * 1024; // same limit as includes/attachments.php
  const ALLOWED = /\.(pdf|docx?|jpe?g|png)$/i;
  const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

  const size = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  function fileCard(f) {
    if (!f) return '';
    return `<a class="file-card" href="/api/messages/file.php?id=${f.id}" download="${LIA.esc(f.name)}">
      ${LIA.icon('clip')}<span><b>${LIA.esc(f.name)}</b>${size(f.size)} · Download</span></a>`;
  }

  function setup({ form, onCase }) {
    const textarea = form.querySelector('textarea');
    const wrap = document.createElement('div');
    wrap.className = 'attach-wrap';
    wrap.innerHTML = `
      <button type="button" class="icon-btn attach-plus" aria-label="Attach" aria-haspopup="menu" aria-expanded="false">${LIA.icon('plus')}</button>
      <div class="attach-menu" role="menu" hidden>
        <button type="button" role="menuitem" data-attach="file">${LIA.icon('clip')}<span>Attach File<small>PDF, Word, JPG or PNG · up to 5 MB</small></span></button>
        ${onCase ? `<button type="button" role="menuitem" data-attach="case">${LIA.icon('folder')}<span>Attach Case<small>Send one of this student's reports</small></span></button>` : ''}
      </div>
      <input type="file" accept="${ACCEPT}" aria-label="Choose a file to attach" hidden>`;
    form.prepend(wrap);

    const plus = wrap.querySelector('.attach-plus');
    const menu = wrap.querySelector('.attach-menu');
    const input = wrap.querySelector('input[type=file]');
    const chip = document.createElement('div');
    chip.className = 'attach-chip';
    chip.hidden = true;
    form.before(chip);

    const state = { file: null };
    const open = (yes) => { menu.hidden = !yes; plus.setAttribute('aria-expanded', String(yes)); if (yes) menu.querySelector('button').focus(); };
    plus.addEventListener('click', (e) => { e.stopPropagation(); open(menu.hidden); });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) open(false); });
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); plus.focus(); } });

    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-attach]');
      if (!b) return;
      open(false);
      if (b.dataset.attach === 'file') input.click();
      else onCase?.();
    });

    input.addEventListener('change', () => {
      const f = input.files[0];
      input.value = ''; // lets the same file be chosen again later
      if (!f) return;
      if (!ALLOWED.test(f.name)) return LIA.toast('Only PDF, Word (.doc, .docx), JPG and PNG files can be sent.', 'error');
      if (f.size > MAX_BYTES) return LIA.toast(`That file is ${size(f.size)}. The limit is 5 MB.`, 'error');
      state.file = f;
      chip.innerHTML = `${LIA.icon('clip')}<span><b>${LIA.esc(f.name)}</b> · ${size(f.size)}</span>
        <button type="button" class="icon-btn" aria-label="Remove file">${LIA.icon('x')}</button>`;
      chip.hidden = false;
      chip.querySelector('button').addEventListener('click', () => { state.clear(); textarea.focus(); });
      textarea.placeholder = 'Add a message (optional)';
      textarea.focus();
    });

    state.clear = () => { state.file = null; chip.hidden = true; chip.innerHTML = ''; textarea.placeholder = textarea.dataset.placeholder; };
    textarea.dataset.placeholder = textarea.placeholder;
    return state;
  }

  return { setup, fileCard };
})();
