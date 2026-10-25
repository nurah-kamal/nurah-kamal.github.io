// The rules of sudoku, with nothing about the page in here, so the tests can use the same code.

export const SIZE = 9;

export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// Every cell that shares a row, column or box with cell i.
const PEERS = Array.from({ length: 81 }, (_, i) => {
  const out = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) out.push(j);
  }
  return out;
});
export const peersOf = (i) => PEERS[i];

// "53..7...." style text, with 0 or . for an empty cell, into 81 numbers.
export function parse(text) {
  const cells = [...text.replace(/\s/g, '')].map((c) => (c === '.' ? 0 : Number(c)));
  if (cells.length !== 81 || cells.some((n) => !Number.isInteger(n) || n < 0 || n > 9)) {
    throw new Error('A puzzle needs 81 cells of 0 to 9');
  }
  return cells;
}

// The cells whose number appears twice in a row, column or box.
export function conflicts(grid) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!grid[i]) continue;
    for (const j of PEERS[i]) {
      if (grid[j] === grid[i]) { bad.add(i); bad.add(j); }
    }
  }
  return bad;
}

const allowed = (grid, i) => {
  const used = new Set(PEERS[i].map((j) => grid[j]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n));
};

// Counts solutions up to `limit`, and returns the first one found.
// Always fills the cell with the fewest options first, which keeps it quick.
export function solve(start, limit = 2) {
  const grid = start.slice();
  let count = 0;
  let first = null;
  if (conflicts(grid).size) return { count: 0, solution: null };
  (function search() {
    if (count >= limit) return;
    let best = -1;
    let options = null;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      const opts = allowed(grid, i);
      if (!opts.length) return;
      if (!options || opts.length < options.length) { best = i; options = opts; if (opts.length === 1) break; }
    }
    if (best === -1) { count += 1; if (!first) first = grid.slice(); return; }
    for (const n of options) {
      grid[best] = n;
      search();
      if (count >= limit) break;
    }
    grid[best] = 0;
  })();
  return { count, solution: first };
}

export const isSolved = (grid) => grid.every((n) => n > 0) && conflicts(grid).size === 0;
