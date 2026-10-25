import { parse, solve, conflicts, isSolved, rowOf, colOf, boxOf } from './sudoku-core.js?v=20261026c';
import { PUZZLES } from './sudoku-puzzles.js?v=20261026c';

const STORE = 'nk-sudoku';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const load = () => { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } };
const save = (state) => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private mode: play without saving */ } };

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

function start(mount) {
  const saved = load();
  let index = saved && Number.isInteger(saved.index) && PUZZLES[saved.index] ? saved.index : Math.floor(Math.random() * PUZZLES.length);
  let givens, grid, solution, hinted, selected = 0, done = false;

  const board = el('div', { class: 'sk-board', role: 'grid', 'aria-label': 'Sudoku. Use the arrow keys to move and 1 to 9 to fill a cell.' });
  const cells = [];
  for (let r = 0; r < 9; r++) {
    const row = el('div', { role: 'row', class: 'sk-row' });
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const cell = el('button', { type: 'button', role: 'gridcell', class: 'sk-cell', tabindex: '-1', 'data-i': String(i) });
      if (c % 3 === 2 && c < 8) cell.classList.add('sk-edge-r');
      if (r % 3 === 2 && r < 8) cell.classList.add('sk-edge-b');
      cells.push(cell);
      row.append(cell);
    }
    board.append(row);
  }

  const pad = el('div', { class: 'sk-pad', role: 'group', 'aria-label': 'Numbers' });
  for (let n = 1; n <= 9; n++) pad.append(el('button', { type: 'button', class: 'sk-key', 'data-n': String(n), 'aria-label': `Enter ${n}` }, String(n)));
  pad.append(el('button', { type: 'button', class: 'sk-key sk-erase', 'data-n': '0', 'aria-label': 'Clear this cell' }, 'Clear'));

  const controls = el('div', { class: 'sk-controls' });
  const btn = (label, fn) => { const b = el('button', { type: 'button', class: 'sk-btn' }, label); b.addEventListener('click', fn); controls.append(b); return b; };
  const status = el('p', { class: 'sk-status', role: 'status', 'aria-live': 'polite' });

  mount.replaceChildren(board, pad, controls, status);

  function setPuzzle(i, keep) {
    index = i;
    givens = parse(PUZZLES[i]);
    solution = solve(givens, 1).solution;
    grid = keep && keep.length === 81 ? keep.slice() : givens.slice();
    hinted = new Set();
    done = false;
    mount.classList.remove('is-solved');
    status.textContent = '';
    render();
    persist();
  }

  const persist = () => save({ index, grid });

  function render() {
    const bad = conflicts(grid);
    const sel = selected;
    const selValue = grid[sel];
    cells.forEach((cell, i) => {
      const v = grid[i];
      const given = givens[i] > 0;
      cell.textContent = v || '';
      cell.classList.toggle('is-given', given);
      cell.classList.toggle('is-five', v === 5);
      cell.classList.toggle('is-hint', hinted.has(i));
      cell.classList.toggle('is-bad', bad.has(i));
      cell.classList.toggle('is-selected', i === sel);
      cell.classList.toggle('is-peer', i !== sel && (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel)));
      cell.classList.toggle('is-same', i !== sel && v > 0 && v === selValue);
      cell.tabIndex = i === sel ? 0 : -1;
      const parts = [`Row ${rowOf(i) + 1}, column ${colOf(i) + 1}`, v ? String(v) : 'empty'];
      if (given) parts.push('given');
      if (bad.has(i)) parts.push('clashes with another cell');
      cell.setAttribute('aria-label', parts.join(', '));
      cell.setAttribute('aria-selected', String(i === sel));
    });
  }

  function select(i, focus = true) {
    selected = Math.max(0, Math.min(80, i));
    render();
    if (focus) cells[selected].focus();
  }

  function enter(n) {
    if (done || givens[selected]) return;
    grid[selected] = n;
    hinted.delete(selected);
    status.textContent = '';
    render();
    persist();
    if (isSolved(grid)) finish();
  }

  function finish() {
    done = true;
    mount.classList.add('is-solved');
    status.textContent = 'Solved. Every row, column and box has 1 to 9 exactly once.';
    if (reduceMotion || !cells[0].animate) return;
    cells.filter((c) => c.classList.contains('is-five')).forEach((c, k) => {
      c.animate(
        [{ backgroundColor: '#D4B8B6' }, { backgroundColor: '#9C4A68', color: '#fff' }, { backgroundColor: '#D4B8B6' }],
        { duration: 700, delay: k * 90, easing: 'ease-in-out' },
      );
    });
  }

  board.addEventListener('click', (e) => {
    const cell = e.target.closest('.sk-cell');
    if (cell) select(Number(cell.dataset.i));
  });
  board.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (moves[e.key] != null) {
      e.preventDefault();
      const next = selected + moves[e.key];
      if (e.key === 'ArrowLeft' && colOf(selected) === 0) return;
      if (e.key === 'ArrowRight' && colOf(selected) === 8) return;
      if (next >= 0 && next < 81) select(next);
    } else if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      enter(Number(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      enter(0);
    }
  });
  pad.addEventListener('click', (e) => {
    const key = e.target.closest('.sk-key');
    if (!key) return;
    enter(Number(key.dataset.n));
    cells[selected].focus({ preventScroll: true });
  });

  btn('Check', () => {
    const wrong = grid.reduce((n, v, i) => n + (v && !givens[i] && v !== solution[i] ? 1 : 0), 0);
    const empty = grid.filter((v) => !v).length;
    if (isSolved(grid)) { finish(); return; }
    status.textContent = wrong
      ? `${wrong} ${wrong === 1 ? 'number doesn’t' : 'numbers don’t'} fit yet. ${empty} empty.`
      : `Everything so far fits. ${empty} empty.`;
  });
  btn('Show one', () => {
    if (done) return;
    const wrong = grid.findIndex((v, i) => v && !givens[i] && v !== solution[i]);
    const target = wrong !== -1 ? wrong : grid.findIndex((v) => !v);
    if (target === -1) return;
    grid[target] = solution[target];
    hinted.add(target);
    selected = target;
    render();
    persist();
    status.textContent = `Filled row ${rowOf(target) + 1}, column ${colOf(target) + 1}.`;
    if (isSolved(grid)) finish();
  });
  btn('Start again', () => setPuzzle(index));
  btn('New puzzle', () => setPuzzle((index + 1) % PUZZLES.length));

  // A puzzle saved as finished moves on to the next one.
  if (saved && saved.index === index && Array.isArray(saved.grid) && isSolved(saved.grid)) setPuzzle((index + 1) % PUZZLES.length);
  else setPuzzle(index, saved && saved.index === index ? saved.grid : null);
  const firstEmpty = grid.findIndex((v) => !v);
  select(firstEmpty === -1 ? 0 : firstEmpty, false);
}

const mount = document.querySelector('#sudoku');
if (mount) start(mount);
