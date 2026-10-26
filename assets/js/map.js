import { LINES, STATIONS } from './projects.js?v=20261026e';

const SVG = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const byLine = (id) => STATIONS.filter((s) => s.line === id);
const slug = (s) => s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// A stop opens its case study or live page; anything else opens its entry in the work list on this page.
const primaryHref = (s) => s.study || s.post || s.live || `#stop-${slug(s)}`;
const external = (href) => /^https?:/.test(href);
const marks = (s) => `is-${s.status}${s.private ? ' is-private' : ''}`;

function el(tag, attrs = {}, text) {
  const node = tag.startsWith('svg:') ? document.createElementNS(SVG, tag.slice(4)) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

function countLine(id) {
  const list = byLine(id);
  const soon = list.filter((s) => s.status === 'soon').length;
  const open = list.length - soon;
  return { open, soon, live: list.filter((s) => s.live).length, cases: list.filter((s) => s.status === 'case').length };
}

function countText(id) {
  const c = countLine(id);
  const parts = [`${c.open} ${c.open === 1 ? 'project' : 'projects'}`];
  if (c.live) parts.push(`${c.live} live`);
  if (c.soon) parts.push(`${c.soon} coming soon`);
  return parts.join(', ');
}

/* ---------- the map (wide screens) ---------- */

const ROW = 118, TOP = 70, FIRST = 400, TRACK = 18, HEIGHT = 594;
const meetTop = TOP + 2 * ROW - 2 * TRACK;

// The map is as wide as the space it sits in: the lines get longer and the stops spread out.
function mapWidth(svg) {
  const box = svg.getBoundingClientRect();
  return box.width && box.height ? Math.max(1200, Math.round((HEIGHT * box.width) / box.height)) : 1200;
}

function drawMap(svg, W) {
  const MEET = W - 120, END = W - 70;
  const GAP = Math.min(300, ...LINES.map((line, i) => {
    const n = byLine(line.id).length;
    const dx = Math.abs(TOP + i * ROW - (meetTop + i * TRACK));
    return n > 1 ? (MEET - dx - 140 - FIRST) / (n - 1) : Infinity;
  }));
  svg.setAttribute('viewBox', `20 10 ${W} ${HEIGHT}`);
  svg.dataset.w = W;
  const lines = el('svg:g', { class: 'm-lines' });
  const stations = el('svg:g', { class: 'm-stations' });
  const labels = el('svg:g', { class: 'm-labels' });
  const defs = el('svg:defs');
  const hatch = el('svg:pattern', { id: 'hatch-private', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  hatch.append(el('svg:rect', { width: 8, height: 8, fill: '#fff' }), el('svg:rect', { width: 3.5, height: 8, fill: '#4A2536' }));
  defs.append(hatch);
  svg.append(defs);

  LINES.forEach((line, i) => {
    const y = TOP + i * ROW;
    const ty = meetTop + i * TRACK;
    const dx = Math.abs(y - ty);
    const d = `M40 ${y} H${MEET - dx} L${MEET} ${ty} H${END}`;
    const g = el('svg:g', { class: `m-line line-${line.id}`, 'data-line': line.id });
    g.append(el('svg:path', { class: 'm-case', d }), el('svg:path', { class: 'm-core', d }));
    if (line.id === 'software') g.append(el('svg:path', { class: 'm-rail', d }));
    lines.append(g);

    const pill = el('svg:a', { href: `#line-${line.id}`, class: `m-pill line-${line.id}`, 'data-line': line.id });
    const w = line.name.length * 11 + 36;
    pill.append(el('svg:rect', { x: 30, y: y - 20, width: w, height: 40, rx: 20 }), el('svg:text', { x: 30 + w / 2, y: y + 7 }, line.name));
    labels.append(pill);

    byLine(line.id).forEach((s, k) => {
      const x = FIRST + k * GAP;
      const href = primaryHref(s);
      const a = el('svg:a', { href, class: `m-stop ${marks(s)} line-${line.id}`, 'data-line': line.id });
      if (external(href)) a.setAttribute('rel', 'noopener');
      const tip = s.status === 'soon' ? `${s.name}, coming soon` : s.private ? `${s.name}, live, code private` : s.name;
      a.append(el('svg:title', {}, tip));
      a.append(el('svg:rect', { class: 'm-hit', x: x - 70, y: y - 50, width: 140, height: 100, rx: 8 }));
      if (s.status === 'case') {
        const span = s.name === 'SA Turnaround' ? ROW : 0;
        a.append(el('svg:rect', { class: 'm-mark', x: x - 18, y: span ? y - 18 : y - 26, width: 36, height: span ? 36 + span : 52, rx: 18 }));
      } else {
        a.append(el('svg:circle', { class: 'm-mark', cx: x, cy: y, r: 13 }));
      }
      const above = (k + i) % 2 === 0;
      a.append(el('svg:text', { class: 'm-name', x, y: above ? y - 32 : y + 50 }, s.name));
      a.dataset.x = x;
      stations.append(a);
    });
  });

  // SA Turnaround and Power BI Turnaround share one interchange, so draw that capsule once on top.
  const ix = stations.querySelector('.m-stop.is-case.line-reporting');
  if (ix) stations.append(ix);
  const pbi = [...stations.querySelectorAll('.m-stop.is-case.line-bi')][0];
  if (pbi) pbi.querySelector('.m-mark').setAttribute('class', 'm-mark m-under');

  const end = el('svg:a', { href: '#contact', class: 'm-end' });
  end.dataset.x = END;
  end.append(
    el('svg:title', {}, 'Contact'),
    el('svg:rect', { class: 'm-hit', x: END - 50, y: meetTop - 50, width: 120, height: 220, rx: 8 }),
    el('svg:rect', { class: 'm-mark', x: END - 20, y: meetTop - 20, width: 40, height: 4 * TRACK + 40, rx: 20 }),
    el('svg:text', { class: 'm-end-small', x: END, y: meetTop + 4 * TRACK + 56 }, 'All lines end at'),
    el('svg:text', { class: 'm-end-big', x: END, y: meetTop + 4 * TRACK + 86 }, 'Contact'),
  );
  stations.append(end);

  svg.append(lines, stations, labels);
  return { lines, stations, labels };
}

function animateMap(svg, parts) {
  if (!svg.animate || document.visibilityState !== 'visible') return;
  // If the tab is hidden mid-draw the animations pause; never leave the map half drawn.
  setTimeout(() => svg.getAnimations({ subtree: true }).forEach((a) => a.finish()), 3000);
  if (reduceMotion) {
    svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease' });
    return;
  }
  const ease = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const DRAW = 1400;
  parts.lines.querySelectorAll('.m-line').forEach((g, i) => {
    g.querySelectorAll('path').forEach((p) => {
      const len = p.getTotalLength();
      const dash = p.classList.contains('m-rail') ? null : len;
      if (dash == null) {
        p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: i * 90 + DRAW - 200, fill: 'backwards' });
        return;
      }
      p.style.strokeDasharray = `${len} ${len}`;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: DRAW, delay: i * 90, easing: ease, fill: 'backwards' })
        .finished.then(() => { p.style.strokeDasharray = ''; }).catch(() => {});
    });
  });
  parts.stations.querySelectorAll('.m-stop, .m-end').forEach((a) => {
    const W = Number(svg.dataset.w || 1200);
    const x = Number(a.dataset.x || W);
    const delay = 120 + (x / W) * (DRAW - 300);
    a.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' });
  });
  parts.labels.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 60, fill: 'backwards' });
}

/* ---------- the line selector ---------- */

function wireSelector(map, legend, readout) {
  let pinned = null;
  const set = (id) => {
    if (id) map.dataset.active = id; else delete map.dataset.active;
    legend.querySelectorAll('[data-line]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.line === id)));
    const line = LINES.find((l) => l.id === id);
    readout.textContent = line ? `${line.name}: ${countText(id)}.` : `Five lines, ${STATIONS.filter((s) => s.status !== 'soon').length} projects you can open. Pick a line to follow it.`;
  };
  legend.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-line]');
    if (!b) return;
    pinned = pinned === b.dataset.line ? null : b.dataset.line;
    set(pinned);
  });
  // Gaps between stops keep the current line, and a short pause stops it flicking between lines as the pointer crosses them.
  let hoverTimer;
  const preview = (e) => {
    const t = e.target.closest('[data-line]');
    if (!t || t.dataset.line === map.dataset.active) return;
    clearTimeout(hoverTimer);
    if (e.type === 'focusin') return set(t.dataset.line);
    hoverTimer = setTimeout(() => set(t.dataset.line), 90);
  };
  for (const area of [map, legend]) {
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      area.addEventListener('pointerover', preview);
      area.addEventListener('pointerleave', () => { clearTimeout(hoverTimer); set(pinned); });
    }
    area.addEventListener('focusin', preview);
    area.addEventListener('focusout', () => set(pinned));
  }
  set(null);
}

function buildLegend(legend) {
  LINES.forEach((line) => {
    const b = el('button', { type: 'button', class: `legend-item line-${line.id}`, 'data-line': line.id, 'aria-pressed': 'false' });
    b.append(el('span', { class: 'swatch', 'aria-hidden': 'true' }), el('span', { class: 'legend-name' }, line.name));
    legend.append(b);
  });
}

/* ---------- the strip index (phones) ---------- */

function buildIndex(list) {
  LINES.forEach((line) => {
    const li = el('li');
    const a = el('a', { href: `#line-${line.id}`, class: `index-row line-${line.id}` });
    const strip = el('span', { class: 'index-strip', 'aria-hidden': 'true' });
    byLine(line.id).forEach((s) => strip.append(el('span', { class: `index-stop ${marks(s)}` })));
    a.append(el('span', { class: 'index-name' }, line.name), strip, el('span', { class: 'index-count' }, countText(line.id)));
    li.append(a);
    list.append(li);
  });
}

/* ---------- work by field ---------- */

const ICON = {
  out: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" /></svg>',
  in: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>',
};

function linkTo(href, label, kind) {
  const a = el('a', { href, class: `st-link ${kind}` });
  if (external(href)) a.setAttribute('rel', 'noopener');
  a.innerHTML = `<span>${label}</span>${external(href) ? ICON.out : ICON.in}`;
  return a;
}

function buildLines(root) {
  LINES.forEach((line) => {
    const sec = el('section', { class: `line-block line-${line.id}`, id: `line-${line.id}`, 'aria-labelledby': `h-${line.id}` });
    const head = el('header', { class: 'line-head' });
    const h = el('h3', { id: `h-${line.id}`, class: 'line-pill' }, line.name);
    head.append(h, el('p', { class: 'line-summary' }, line.summary), el('p', { class: 'line-note' }, line.note));
    if (line.repo) head.append(linkTo(line.repo, `${line.repo.split('/').pop()} on GitHub`, 'repo'));
    else head.append(el('p', { class: 'line-private' }, 'This repository is private for now.'));

    const ol = el('ol', { class: 'stops' });
    byLine(line.id).forEach((s) => {
      const li = el('li', { class: `stop ${marks(s)}`, id: `stop-${slug(s)}` });
      const mark = el('span', { class: 'stop-mark', 'aria-hidden': 'true' });
      const body = el('div', { class: 'stop-body' });
      const title = el('h4', { class: 'stop-name' }, s.name);
      if (s.status === 'case') title.append(el('span', { class: 'tag' }, 'Case study'));
      if (s.status === 'soon') title.append(el('span', { class: 'tag tag-soon' }, 'Coming soon'));
      body.append(title, el('p', { class: 'stop-blurb' }, s.blurb));
      if (s.tools) body.append(el('p', { class: 'stop-tools' }, s.tools));
      const links = el('p', { class: 'stop-links' });
      if (s.study) links.append(linkTo(s.study, 'Read the case study', 'primary'));
      if (s.post) links.append(linkTo(s.post, 'Read the write-up', 'primary'));
      if (s.live) links.append(linkTo(s.live, s.liveLabel || 'Open it live', s.study ? '' : 'primary'));
      if (s.code) links.append(linkTo(s.code, 'Code', ''));
      if (s.extra) links.append(linkTo(s.extra.href, s.extra.label, ''));
      if (s.more) links.append(linkTo(s.more, 'More about Firefly', ''));
      if (links.childElementCount) body.append(links);
      li.append(mark, body);
      ol.append(li);
    });
    sec.append(head, ol);
    root.append(sec);
  });
}

/* ---------- start ---------- */

const svg = document.querySelector('#map-svg');
if (svg) {
  let parts = drawMap(svg, mapWidth(svg));
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const W = mapWidth(svg);
      if (W === Number(svg.dataset.w)) return;
      svg.getAnimations({ subtree: true }).forEach((a) => a.finish());
      svg.replaceChildren();
      parts = drawMap(svg, W);
    }, 150);
  });
  buildLegend(document.querySelector('#legend'));
  wireSelector(svg, document.querySelector('#legend'), document.querySelector('#readout'));
  // The map sits below the intro, so the lines draw when it scrolls into view rather than on load.
  if (matchMedia('(min-width: 75em)').matches && !reduceMotion && 'IntersectionObserver' in window && document.visibilityState === 'visible') {
    svg.classList.add('is-waiting');
    const start = () => {
      if (!svg.classList.contains('is-waiting')) return;
      svg.classList.remove('is-waiting');
      io.disconnect();
      animateMap(svg, parts);
    };
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) start(); }, { threshold: 0.3 });
    io.observe(svg);
    document.addEventListener('visibilitychange', start, { once: true });
  }
}
const fields = document.querySelector('#hero-fields');
if (fields) {
  LINES.forEach((line) => {
    const a = el('a', { href: `#line-${line.id}`, class: `line-${line.id}` });
    a.append(el('span', { class: 'hf-bar', 'aria-hidden': 'true' }), el('span', { class: 'hf-name' }, line.name), el('span', { class: 'hf-count' }, countText(line.id)));
    const li = el('li');
    li.append(a);
    fields.append(li);
  });
}
const index = document.querySelector('#line-index');
if (index) buildIndex(index);
const work = document.querySelector('#lines');
if (work) {
  buildLines(work);
  // The list is built after the browser looked for a #stop- link, so scroll to it now.
  const target = location.hash.startsWith('#stop-') && document.getElementById(location.hash.slice(1));
  if (target) addEventListener('load', () => target.scrollIntoView({ behavior: 'instant' }), { once: true });
}
