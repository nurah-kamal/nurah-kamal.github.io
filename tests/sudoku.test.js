import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, solve, conflicts, isSolved, peersOf } from '../assets/js/sudoku-core.js';
import { PUZZLES } from '../assets/js/sudoku-puzzles.js';

test('every puzzle has exactly one solution', () => {
  assert.ok(PUZZLES.length >= 5 && PUZZLES.length <= 10);
  for (const p of PUZZLES) {
    const { count, solution } = solve(parse(p), 2);
    assert.equal(count, 1, `puzzle ${p.slice(0, 9)} has ${count} solutions`);
    assert.ok(isSolved(solution));
  }
});

test('every puzzle is easy to medium: 30 to 45 givens, no clashes', () => {
  for (const p of PUZZLES) {
    const g = parse(p);
    const givens = g.filter(Boolean).length;
    assert.ok(givens >= 30 && givens <= 45, `${givens} givens`);
    assert.equal(conflicts(g).size, 0);
  }
});

test('the solution keeps every given', () => {
  for (const p of PUZZLES) {
    const g = parse(p);
    const { solution } = solve(g, 1);
    g.forEach((v, i) => { if (v) assert.equal(solution[i], v); });
  }
});

test('a clash in a row, a column or a box is found', () => {
  const empty = Array(81).fill(0);
  const row = empty.slice(); row[0] = 4; row[8] = 4;
  assert.deepEqual([...conflicts(row)].sort((a, b) => a - b), [0, 8]);
  const col = empty.slice(); col[2] = 7; col[74] = 7;
  assert.deepEqual([...conflicts(col)].sort((a, b) => a - b), [2, 74]);
  const box = empty.slice(); box[0] = 9; box[20] = 9;
  assert.deepEqual([...conflicts(box)].sort((a, b) => a - b), [0, 20]);
  const fine = empty.slice(); fine[0] = 1; fine[40] = 1;
  assert.equal(conflicts(fine).size, 0);
});

test('a grid with a clash has no solution', () => {
  const g = parse(PUZZLES[0]);
  const i = g.findIndex((v) => !v);
  g[i] = g[peersOf(i).find((j) => g[j])];
  assert.equal(solve(g, 2).count, 0);
});

test('filling the solution in one cell at a time never clashes and ends solved', () => {
  for (const p of PUZZLES) {
    const g = parse(p);
    const { solution } = solve(g, 1);
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      g[i] = solution[i];
      assert.equal(conflicts(g).size, 0);
    }
    assert.ok(isSolved(g));
  }
});

test('a bad puzzle string is refused', () => {
  assert.throws(() => parse('123'));
  assert.throws(() => parse('x'.repeat(81)));
});
