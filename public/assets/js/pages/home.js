// Student/guest home page.

(async () => {
  const me = await LIA.start();
  const acct = me.account;

  // Guest reminder at the top
  if (acct.accountType === 'guest') {
    const days = LIA.daysLeft(acct.expiresAt);
    const pending = me.activation?.status === 'Pending';
    document.getElementById('guestBanner').innerHTML = `
      <div class="banner">
        <span><strong>Guest account.</strong> ${days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} left (until ${LIA.esc(LIA.fmtDate(acct.expiresAt))}).` : 'Kept open while your report is being handled.'}
        ${pending ? ' Your request for a student account is being reviewed.' : ''}</span>
        ${pending ? '' : '<a class="btn btn-quiet" href="/app/account.html#activate">Make it permanent</a>'}
      </div>`;
  }
})();

// Click a poster to see it bigger
document.querySelectorAll('[data-poster]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const caption = btn.closest('figure').querySelector('figcaption strong').textContent;
    LIA.openModal({
      title: caption,
      wide: true,
      body: `<img src="${btn.dataset.poster}" alt="Poster by ${LIA.esc(caption)}" style="width:100%;max-height:75vh;object-fit:contain">`,
    });
  });
});

// Videos load only when clicked (saves mobile data and keeps the page fast)
document.querySelectorAll('[data-youtube]').forEach((el) => {
  const id = el.dataset.youtube;
  el.innerHTML = `<button type="button" aria-label="Play video"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="play"></span></button>`;
  el.querySelector('button').addEventListener('click', () => {
    el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" title="Anti-bullying video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
});
