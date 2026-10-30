// A small PDF maker for LagroInAction (no outside library needed).
// It draws a title and a table, with automatic page breaks and page numbers,
// using the standard Helvetica font that every PDF reader has.
//
//   LIA_PDF.table({
//     title: 'Resolved Report Records',
//     subtitle: 'Lagro High School Guidance Office',
//     columns: [{ label: 'Case ID', width: 60 }, { label: 'Category' }],   // widths in points; blank = share the rest
//     rows: [['#12', 'Cyberbullying'], ...],
//     filename: 'records.pdf',
//     landscape: true,
//   });

const LIA_PDF = (() => {
  // Character widths of Helvetica and Helvetica-Bold (from the standard font metrics), for ASCII 32..126.
  const W = {
    normal: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],
    bold: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584],
  };

  // PDF text uses the "WinAnsi" character set. Map common symbols into it; anything else becomes "?".
  const SPECIAL = { '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '…': 0x85, '₱': null };
  function toAnsi(text) {
    let out = '';
    for (const ch of String(text ?? '').replace(/₱/g, 'PHP ')) {
      const c = ch.codePointAt(0);
      if (c >= 32 && c <= 126) out += ch;
      else if (c >= 160 && c <= 255) out += String.fromCharCode(c);
      else if (SPECIAL[ch]) out += String.fromCharCode(SPECIAL[ch]);
      else if (ch === '\n' || ch === '\t') out += ' ';
      else out += '?';
    }
    return out;
  }
  function textWidth(s, size, bold) {
    const table = bold ? W.bold : W.normal;
    let w = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      w += c >= 32 && c <= 126 ? table[c - 32] : 556;
    }
    return (w * size) / 1000;
  }
  // Splits text into lines that fit the width (breaks long words too).
  function wrap(text, width, size, bold) {
    const lines = [];
    for (const para of toAnsi(text).split(/\r?\n/)) {
      let line = '';
      for (const word of para.split(' ')) {
        const tryLine = line ? line + ' ' + word : word;
        if (textWidth(tryLine, size, bold) <= width) { line = tryLine; continue; }
        if (line) lines.push(line);
        let w = word;
        while (textWidth(w, size, bold) > width) { // a single very long word
          let cut = w.length;
          while (cut > 1 && textWidth(w.slice(0, cut), size, bold) > width) cut--;
          lines.push(w.slice(0, cut)); w = w.slice(cut);
        }
        line = w;
      }
      lines.push(line);
    }
    return lines.length ? lines : [''];
  }
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const num = (n) => (Math.round(n * 100) / 100).toString();

  function table({ title, subtitle = '', columns, rows, filename = 'LagroInAction.pdf', landscape = true, note = '' }) {
    const pageW = landscape ? 842 : 595, pageH = landscape ? 595 : 842; // A4 in points
    const margin = 36, size = 9, lineH = 11.5, padX = 5, padY = 4;
    const usable = pageW - margin * 2;

    // Column widths: fixed ones first, the rest share what's left
    const fixed = columns.reduce((t, c) => t + (c.width || 0), 0);
    const flexCount = columns.filter((c) => !c.width).length || 1;
    const widths = columns.map((c) => c.width || (usable - fixed) / flexCount);

    // Lay out every row first so we know how many pages there are
    const headLines = columns.map((c, i) => wrap(c.label, widths[i] - padX * 2, size, true));
    const headH = Math.max(...headLines.map((l) => l.length)) * lineH + padY * 2;
    const laid = rows.map((r) => {
      const cells = columns.map((_, i) => wrap(r[i], widths[i] - padX * 2, size, false));
      return { cells, h: Math.max(...cells.map((l) => l.length)) * lineH + padY * 2 };
    });

    const pages = [];
    let page = [], y = 0;
    const topFirst = 92, topOther = 50, bottom = pageH - 40;
    let limit = bottom - topFirst - headH;
    laid.forEach((row) => {
      if (y + row.h > limit && page.length) { pages.push(page); page = []; y = 0; limit = bottom - topOther - headH; }
      page.push(row); y += row.h;
    });
    pages.push(page);

    const generated = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
    const streams = pages.map((rowsOnPage, p) => {
      const ops = [];
      const text = (x, yTop, s, bold, sz = size, color = '0.09 0.21 0.16') =>
        ops.push(`BT ${color} rg /${bold ? 'F2' : 'F1'} ${sz} Tf ${num(x)} ${num(pageH - yTop)} Td (${esc(s)}) Tj ET`);
      let top = margin;
      if (p === 0) {
        text(margin, top + 14, toAnsi(title), true, 15, '0.11 0.37 0.13');
        if (subtitle) text(margin, top + 30, toAnsi(subtitle), false, 9.5, '0.36 0.42 0.39');
        text(margin, top + 43, toAnsi(`Generated ${generated}${note ? ' · ' + note : ''}`), false, 8.5, '0.36 0.42 0.39');
        top = topFirst;
      } else {
        text(margin, top + 4, toAnsi(title + ' (continued)'), true, 10, '0.11 0.37 0.13');
        top = topOther;
      }
      // Header row: green background, white bold text
      ops.push(`0.11 0.37 0.13 rg ${num(margin)} ${num(pageH - top - headH)} ${num(usable)} ${num(headH)} re f`);
      let x = margin;
      headLines.forEach((lines, i) => {
        lines.forEach((l, k) => text(x + padX, top + padY + lineH * (k + 1) - 2.5, l, true, size, '1 1 1'));
        x += widths[i];
      });
      top += headH;
      // Body rows
      rowsOnPage.forEach((row, r) => {
        if (r % 2 === 1) ops.push(`0.97 0.98 0.97 rg ${num(margin)} ${num(pageH - top - row.h)} ${num(usable)} ${num(row.h)} re f`);
        let cx = margin;
        row.cells.forEach((lines, i) => {
          lines.forEach((l, k) => text(cx + padX, top + padY + lineH * (k + 1) - 2.5, l, false));
          cx += widths[i];
        });
        top += row.h;
        ops.push(`0.86 0.9 0.87 RG 0.5 w ${num(margin)} ${num(pageH - top)} m ${num(margin + usable)} ${num(pageH - top)} l S`);
      });
      if (!rows.length) text(margin + padX, top + 16, 'No records.', false, size, '0.36 0.42 0.39');
      // Footer
      text(margin, pageH - 20, 'LagroInAction · Lagro High School Guidance Office · Confidential', false, 8, '0.45 0.5 0.47');
      const pn = `Page ${p + 1} of ${pages.length}`;
      text(pageW - margin - textWidth(pn, 8, false), pageH - 20, pn, false, 8, '0.45 0.5 0.47');
      return ops.join('\n');
    });

    // Write the PDF file: catalog, page list, two fonts, then each page and its drawing commands
    const objs = [];
    const add = (body) => { objs.push(body); return objs.length; };
    const catalog = add(null), pagesObj = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = streams.map((s) => {
      const content = add(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
      return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`);
    });
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    objs.push(`<< /Title (${esc(toAnsi(title))}) /Producer (LagroInAction) >>`);
    const info = objs.length;

    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    objs.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;

    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return bytes.length;
  }

  return { table };
})();
