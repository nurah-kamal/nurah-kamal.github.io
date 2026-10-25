// Loads a report straight from its repository each time the page opens, so it is never out of date,
// and draws the small part of Markdown these reports use: headings, paragraphs, lists and tables.

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text, base) {
  let s = escape(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const url = /^https?:\/\//.test(href) ? href : new URL(href, base).href;
    return `<a href="${url}" rel="noopener">${label}</a>`;
  });
  return s;
}

const cellsOf = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function render(md, base) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length + 1, 4);
      out.push(`<h${level}>${inline(h[2], base)}</h${level}>`);
      i++;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const head = cellsOf(rows[0]);
      const align = rows[1] ? cellsOf(rows[1]).map((c) => (c.endsWith(':') ? 'num' : '')) : [];
      const body = rows.slice(2).map(cellsOf);
      const th = head.map((c, k) => `<th scope="col"${align[k] ? ' class="num"' : ''}>${inline(c, base)}</th>`).join('');
      const tr = body.map((r) => `<tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${inline(c, base)}</th>` : `<td${align[k] ? ' class="num"' : ''}>${inline(c, base)}</td>`)).join('')}</tr>`).join('');
      out.push(`<div class="table-scroll"><table class="data-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
      out.push(`<ul>${items.map((t) => `<li>${inline(t, base)}</li>`).join('')}</ul>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*\||\s*[-*]\s)/.test(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '), base)}</p>`);
  }
  return out.join('\n');
}

async function start(box) {
  const status = box.querySelector('.report-status');
  try {
    const res = await fetch(box.dataset.src, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const md = await res.text();
    const body = document.createElement('div');
    body.className = 'report-body';
    body.innerHTML = render(md, box.dataset.base);
    box.replaceChildren(body);
    const week = md.match(/week ending (\d{4}-\d{2}-\d{2})/);
    const book = document.querySelector('[data-workbook]');
    if (week && book) {
      book.href = book.dataset.workbook.replace('{date}', week[1]);
      book.hidden = false;
    }
  } catch {
    if (status) status.innerHTML = `The report couldn&rsquo;t load just now. <a href="${box.dataset.fallback}" rel="noopener">Read it on GitHub</a>.`;
  }
}

document.querySelectorAll('[data-report]').forEach(start);
