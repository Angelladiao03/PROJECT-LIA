// Shared code for the two Messages pages (students and staff).
//
//   ATTACH.setup({ form, onCase })   the "+" button at the left of the message box:
//                                    Attach File (everyone) and Attach Case (staff, general chats only)
//   CHAT.render(messages, opts)       the messages of one chat, like Messenger
//   CHAT.composer({ form, ... })      sending, editing and deleting your own messages (the ⋮ menu)

const ATTACH = (() => {
  const MAX_BYTES = 5 * 1024 * 1024; // same limit as includes/attachments.php
  const ALLOWED = /\.(pdf|docx?|jpe?g|png)$/i;
  const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

  const size = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  // A file inside a message: a simple grey box with the file's name (like Messenger). Clicking downloads it.
  function fileCard(f) {
    if (!f) return '';
    // f.url: staff chat files download from their own address; student chat files from messages/file.php
    return `<a class="file-card" href="${LIA.esc(f.url || '/api/messages/file.php?id=' + f.id)}" download="${LIA.esc(f.name)}" title="Download ${LIA.esc(f.name)}">
      <span class="file-icon">${LIA.icon('file')}</span><span><b>${LIA.esc(f.name)}</b><small>${size(f.size)}</small></span></a>`;
  }

  // onCase: function to run for "Attach Case"; canCase(): whether "Attach Case" shows right now
  function setup({ form, onCase, canCase = () => true }) {
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
    const open = (yes) => {
      const caseBtn = menu.querySelector('[data-attach=case]');
      if (caseBtn) caseBtn.hidden = !canCase();
      menu.hidden = !yes; plus.setAttribute('aria-expanded', String(yes));
      if (yes) menu.querySelector('button').focus();
    };
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
    state.show = (yes) => { wrap.hidden = !yes; if (!yes) state.clear(); };
    textarea.dataset.placeholder = textarea.placeholder;
    return state;
  }

  return { setup, fileCard };
})();

const CHAT = (() => {
  // opts: caseCard(c) -> HTML for a report case card; who(m) -> name under the other person's messages
  // A divider shows where each day starts ("Today", "Yesterday", "Monday", "Nov 2, 2026"),
  // and each message shows its time (the full date and time shows when you point at it).
  // closed = a closed report chat: read-only, so no ⋮ Edit / Delete
  // Automatic notices from the system (from = 'system', e.g. "This conversation was closed...")
  // show in the middle of the chat instead of in a bubble.
  function render(messages, { caseCard, who, closed = false }) {
    let lastDay = null;
    return messages.map((m) => {
      const day = LIA.dayLabel(m.sentAt);
      const divider = day !== lastDay ? `<div class="day-divider"><span>${LIA.esc(day)}</span></div>` : '';
      lastDay = day;
      if (m.from === 'system') {
        return `${divider}<div class="msg-system" data-msg="${m.id}"><span>${LIA.esc(m.text)}</span>
          <time title="${LIA.esc(LIA.fmtDateTime(m.sentAt))}">Automatic message · ${LIA.esc(LIA.fmtTime(m.sentAt))}</time></div>`;
      }
      const side = m.mine ? 'mine' : 'theirs';
      // Like Messenger: a file or case card sits on its own, and the text gets its own bubble under it
      const parts = m.deleted
        ? `<div class="bubble deleted"><span class="deleted-text">${m.mine ? 'You deleted this message' : 'This message was deleted'}</span></div>`
        : (m.case ? caseCard(m.case) : '') + ATTACH.fileCard(m.file) + (m.text ? `<div class="bubble ${side}">${LIA.esc(m.text)}</div>` : '');
      const more = m.mine && !m.deleted && !closed
        ? `<button type="button" class="icon-btn msg-more" data-more="${m.id}" aria-label="Options for this message" aria-haspopup="menu">${LIA.icon('dots')}</button>`
        : '';
      return `${divider}<div class="msg ${side}" data-msg="${m.id}">
          <div class="msg-row">${more}<div class="msg-parts">${parts}</div></div>
          <div class="bubble-meta" title="${LIA.esc(LIA.fmtDateTime(m.sentAt))}">${m.mine ? 'You' : LIA.esc(who(m))} · ${LIA.esc(LIA.fmtTime(m.sentAt))}${m.edited ? ' · Edited' : ''}</div>
        </div>`;
    }).join('');
  }

  // Sending, and the ⋮ menu on your own messages (Edit / Delete).
  //   send(text, file) and edit(id, text) and remove(id) return promises (the API calls)
  //   messages() returns the messages currently shown; reload() redraws the chat
  function composer({ form, log, attach, send, edit, remove, messages, reload }) {
    const textarea = form.text;
    const sendBtn = form.querySelector('button[type=submit]');
    const sendLabel = sendBtn.innerHTML;
    let editing = null; // id of the message being edited

    // Banner above the message box while editing
    const banner = document.createElement('div');
    banner.className = 'edit-banner';
    banner.hidden = true;
    banner.innerHTML = `${LIA.icon('edit')}<span>Editing message</span><button type="button" class="btn btn-ghost btn-sm">Cancel</button>`;
    form.before(banner);
    const stopEditing = () => {
      editing = null; banner.hidden = true; textarea.value = '';
      sendBtn.innerHTML = sendLabel; attach.show(true);
    };
    banner.querySelector('button').addEventListener('click', stopEditing);

    // The small menu next to your message
    let menu = null;
    const closeMenu = () => { menu?.remove(); menu = null; };
    document.addEventListener('click', (e) => { if (menu && !menu.contains(e.target) && !e.target.closest('[data-more]')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    log.addEventListener('scroll', closeMenu);

    log.addEventListener('click', async (e) => {
      const more = e.target.closest('[data-more]');
      if (!more) return;
      if (menu && menu.dataset.for === more.dataset.more) return closeMenu();
      closeMenu();
      const id = Number(more.dataset.more);
      menu = document.createElement('div');
      menu.className = 'msg-menu';
      menu.dataset.for = String(id);
      menu.setAttribute('role', 'menu');
      menu.innerHTML = `<button type="button" role="menuitem" data-do="edit">${LIA.icon('edit')} Edit</button>
                        <button type="button" role="menuitem" data-do="delete" class="danger">${LIA.icon('trash')} Delete</button>`;
      more.closest('.msg-row').append(menu);
      menu.querySelector('button').focus();
      menu.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-do]');
        if (!b) return;
        closeMenu();
        const m = messages().find((x) => x.id === id);
        if (!m) return;
        if (b.dataset.do === 'edit') {
          editing = id;
          attach.show(false); // a file can't be added while editing
          textarea.value = m.text;
          banner.hidden = false;
          sendBtn.innerHTML = 'Save';
          textarea.focus();
          return;
        }
        const ok = await LIA.confirmBox({ title: 'Delete message?', text: 'It will show as "deleted" in the chat for everyone.', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        try { await remove(id); if (editing === id) stopEditing(); await reload(); } catch (err) { LIA.toast(err.message, 'error'); }
      });
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
      if (e.key === 'Escape' && editing) stopEditing();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      try {
        if (editing) {
          await LIA.busy(sendBtn, () => edit(editing, text));
          stopEditing();
        } else {
          if (!text && !attach.file) return;
          const res = await LIA.busy(sendBtn, () => send(text, attach.file));
          if (attach.file) LIA.toast(res.message);
          textarea.value = '';
          attach.clear();
        }
        await reload();
      } catch (err) { LIA.toast(err.message, 'error'); }
    });
    return { stopEditing, isEditing: () => editing !== null };
  }

  return { render, composer };
})();
