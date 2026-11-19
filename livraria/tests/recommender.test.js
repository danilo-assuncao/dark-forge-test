'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../recommender.js');

test('daysToFinish rounds up from minutes per day', () => {
  // 40 pages = 60 min; 200 pages = 300 min
  assert.equal(R.daysToFinish({ pages: 40 }, 30), 2);
  assert.equal(R.daysToFinish({ pages: 200 }, 60), 5);
  assert.equal(R.daysToFinish({ pages: 200 }, 70), 5);
  assert.equal(R.daysToFinish('financas-sem-medo', 60), 5);
});

test('daysToFinish returns null for invalid input', () => {
  assert.equal(R.daysToFinish('nope', 30), null);
  assert.equal(R.daysToFinish('financas-sem-medo', 0), null);
  assert.equal(R.daysToFinish('financas-sem-medo', -5), null);
  assert.equal(R.daysToFinish('financas-sem-medo', 'x'), null);
  assert.equal(R.daysToFinish({ pages: 0 }, 30), null);
});

test('recommend orders by days and filters by genre', () => {
  const list = R.recommend({ genre: 'negocios', minutesPerDay: 30 });
  assert.equal(list.length, 3);
  assert.ok(list.every((r) => r.book.genre === 'negocios'));
  assert.deepEqual(list.map((r) => r.book.id),
    ['financas-sem-medo', 'lideranca-essencial', 'startups-do-zero']);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].days >= list[i - 1].days);
});

test('recommend supports limit, maxDays and invalid minutes', () => {
  assert.equal(R.recommend({ minutesPerDay: 30, limit: 2 }).length, 2);
  const all = R.recommend({ genre: 'negocios', minutesPerDay: 30 });
  assert.deepEqual(all.map((r) => r.days), [10, 11, 16]);
  assert.deepEqual(R.recommend({ genre: 'negocios', minutesPerDay: 30, maxDays: 10 }).map((r) => r.book.id),
    ['financas-sem-medo']);
  assert.equal(R.recommend({ genre: 'negocios', minutesPerDay: 30, maxDays: 11 }).length, 2); // inclusive
  assert.equal(R.recommend({ genre: 'negocios', minutesPerDay: 30, maxDays: 9 }).length, 0);
  assert.equal(R.recommend({ genre: 'negocios', minutesPerDay: 30, maxDays: NaN }).length, 3);
  assert.deepEqual(R.recommend({ minutesPerDay: 30, limit: 0 }), []);
  assert.equal(R.recommend({ minutesPerDay: 30, limit: 1.9 }).length, 1);
  assert.equal(R.recommend({ minutesPerDay: 30, limit: -1 }).length, 12);
  assert.deepEqual(R.recommend({ minutesPerDay: 0 }), []);
  assert.deepEqual(R.recommend(), []);
  assert.deepEqual(R.recommend({ genre: 'nope', minutesPerDay: 30 }), []);
});

test('recommendPlan scales with daily minutes', () => {
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 5 }).plan.id, 'leve');
  const mid = R.recommendPlan({ genre: 'negocios', minutesPerDay: 30 });
  assert.equal(mid.plan.id, 'classico');
  assert.equal(R.recommendPlan({ minutesPerDay: 120 }).plan.id, 'maratona');
  assert.equal(R.recommendPlan({ genre: 'nope', minutesPerDay: 30 }), null);
  assert.equal(R.recommendPlan({ minutesPerDay: 0 }), null);
});

test('recommend breaks day ties by pages', () => {
  const pages = R.recommend({ minutesPerDay: 600 }).map((r) => r.book.pages);
  assert.ok(pages.every((p, i) => i === 0 || p >= pages[i - 1]));
  // minutesPerDay 600 -> days are 1 or 2; ties within the same days sort by pages
  const list = R.recommend({ minutesPerDay: 600 });
  list.forEach((r, i) => { if (i && r.days === list[i - 1].days) assert.ok(r.book.pages >= list[i - 1].book.pages); });
});

test('recommendPlan returns details, boundaries and handles invalid input', () => {
  const d = R.recommendPlan({ genre: 'negocios', minutesPerDay: 30 });
  assert.equal(d.plan.id, 'classico');
  assert.equal(d.booksPerMonthCapacity, 2);
  assert.equal(d.averageReadingMinutes, 356);
  // exact boundary: capacity/avg === 1 and 2 (avg 356 -> 356*n/30 min/day)
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 356 / 30 }).booksPerMonthCapacity, 1);
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 356 / 30 }).plan.id, 'leve');
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: (356 * 2) / 30 }).plan.id, 'classico');
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 1 }).booksPerMonthCapacity, 0);
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 1 }).plan.id, 'leve');
  // whole catalog (12 books) can reach maratona (4)
  const whole = R.recommendPlan({ minutesPerDay: 300 });
  assert.equal(whole.plan.id, 'maratona');
  assert.equal(R.recommendPlan({ minutesPerDay: 300 }).booksPerMonthCapacity >= 4, true);
  assert.equal(R.recommendPlan(), null);
  assert.equal(R.recommendPlan({ minutesPerDay: NaN }), null);
  assert.equal(R.recommendPlan({ minutesPerDay: Infinity }), null);
});

test('recommendPlan caps capacity by the genre size', () => {
  const p = R.recommendPlan({ genre: 'negocios', minutesPerDay: 120 });
  assert.equal(p.booksPerMonthCapacity, 3);
  assert.equal(p.plan.id, 'classico');
});

test('recommendBox fills the plan with titles', () => {
  const box = R.recommendBox({ genre: 'negocios', minutesPerDay: 30 });
  assert.equal(box.plan.id, 'classico');
  assert.equal(box.titles.length, box.plan.booksPerMonth);
  assert.deepEqual(box.titles.map((t) => t.book.id), ['financas-sem-medo', 'lideranca-essencial']);
  assert.equal(R.recommendBox({ minutesPerDay: -1 }), null);
});

test('recommendBox never underfills a heavy single-genre reader', () => {
  const box = R.recommendBox({ genre: 'negocios', minutesPerDay: 120 });
  assert.equal(box.titles.length, box.plan.booksPerMonth);
  const whole = R.recommendBox({ minutesPerDay: 300 });
  assert.equal(whole.plan.id, 'maratona');
  assert.equal(whole.titles.length, 4);
});

test('module attaches to the browser global and needs the catalog', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const win = {};
  const ctx = vm.createContext({ window: win });
  vm.runInContext(read('recommender.js'), ctx); // loaded before books.js
  assert.ok(win.DanBooksRecommender);
  assert.throws(() => win.DanBooksRecommender.daysToFinish('x', 30), /books\.js/);
  vm.runInContext(read('books.js'), ctx);
  assert.equal(win.DanBooksRecommender.daysToFinish('financas-sem-medo', 60), 5);
  ['PLANS', 'daysToFinish', 'recommend', 'recommendPlan', 'recommendBox'].forEach((k) =>
    assert.ok(k in win.DanBooksRecommender, k));
});
