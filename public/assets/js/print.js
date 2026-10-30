// Staff: "Print or save as PDF" for table-style records.
// Used by Report Records (a page of records, or all of them), Messages (one student's reports)
// and the case window (one case record).
//
//   PRINT.choose({
//     title: 'Resolved Report Records',
//     columns: [{ label: 'Case ID', width: 60 }, ...],
//     sets: [{ label: 'This page (10 records)', rows: [...] }, { label: 'All matching records (34)', rows: [...] }],
//     filename: 'resolved-records',
//   });

const PRINT = (() => {
  const SCHOOL = 'Lagro High School Guidance Office · LagroInAction';

  // Prints with the browser: builds a plain table in #printArea and prints only that.
  function printTable({ title, subtitle, columns, rows, note }) {
    let area = document.getElementById('printArea');
    if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.append(area); }
    const generated = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
    area.innerHTML = `
      <h1>${LIA.esc(title)}</h1>
      <p class="print-sub">${LIA.esc(subtitle || SCHOOL)}<br>Generated ${LIA.esc(generated)}${note ? ' · ' + LIA.esc(note) : ''}</p>
      <table>
        <thead><tr>${columns.map((c) => `<th${c.width ? ` style="width:${c.width}pt"` : ''}>${LIA.esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows.length ? rows.map((r) => `<tr>${r.map((v) => `<td>${LIA.esc(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}">No records.</td></tr>`}</tbody>
      </table>
      <p class="print-foot">Confidential · ${LIA.esc(SCHOOL)}</p>`;
    document.body.classList.add('printing-list');
    const after = () => { document.body.classList.remove('printing-list'); window.removeEventListener('afterprint', after); };
    window.addEventListener('afterprint', after);
    window.print();
    setTimeout(after, 1000); // some browsers don't fire afterprint
  }

  function savePdf({ title, subtitle, columns, rows, filename, note, landscape = true }) {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    LIA_PDF.table({ title, subtitle: subtitle || SCHOOL, columns, rows, note, landscape, filename: `${filename || 'LagroInAction'}-${day}.pdf` });
    LIA.toast('PDF saved to your Downloads.');
  }

  // Opens the window where staff choose WHAT to print (if there are choices) and HOW (print or PDF).
  function choose({ title, subtitle, columns, sets, filename, landscape = true }) {
    const many = sets.length > 1;
    LIA.openModal({
      title: 'Print or save as PDF',
      body: `
        <p style="margin-top:0"><b>${LIA.esc(title)}</b></p>
        ${many ? `<fieldset class="print-choice"><legend>What to include</legend>
          ${sets.map((s, i) => `<label class="check-row"><input type="radio" name="printSet" value="${i}" ${i === 0 ? 'checked' : ''}> <span>${LIA.esc(s.label)}</span></label>`).join('')}
        </fieldset>` : `<p class="small muted">${LIA.esc(sets[0].label)}</p>`}
        <p class="small muted" style="margin-bottom:0"><b>Print</b> opens your printer window. <b>Save as PDF</b> downloads a PDF file you can keep or send.</p>`,
      foot: `<button class="btn btn-gray" data-close>Cancel</button>
             <button class="btn btn-quiet" data-out="print">Print</button>
             <button class="btn" data-out="pdf">Save as PDF</button>`,
      onOpen: (el, close) => {
        el.querySelectorAll('[data-out]').forEach((b) => b.addEventListener('click', () => {
          const set = sets[many ? Number(el.querySelector('[name=printSet]:checked').value) : 0];
          const job = { title, subtitle, columns, rows: set.rows, filename, landscape, note: `${set.rows.length} ${set.rows.length === 1 ? 'record' : 'records'}` };
          close();
          if (b.dataset.out === 'pdf') savePdf(job); else setTimeout(() => printTable(job), 50);
        }));
      },
    });
  }

  return { choose, printTable, savePdf };
})();
