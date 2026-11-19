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
  assert.ok(R.recommend({ minutesPerDay: 30, maxDays: 10 }).every((r) => r.days <= 10));
  assert.deepEqual(R.recommend({ minutesPerDay: 0 }), []);
  assert.deepEqual(R.recommend(), []);
  assert.deepEqual(R.recommend({ genre: 'nope', minutesPerDay: 30 }), []);
});

test('recommendPlan scales with daily minutes', () => {
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 5 }).plan.id, 'leve');
  const mid = R.recommendPlan({ genre: 'negocios', minutesPerDay: 30 });
  assert.equal(mid.plan.id, 'classico');
  assert.equal(R.recommendPlan({ genre: 'negocios', minutesPerDay: 120 }).plan.id, 'maratona');
  assert.equal(R.recommendPlan({ genre: 'nope', minutesPerDay: 30 }), null);
  assert.equal(R.recommendPlan({ minutesPerDay: 0 }), null);
});

test('recommendBox fills the plan with titles', () => {
  const box = R.recommendBox({ genre: 'negocios', minutesPerDay: 30 });
  assert.equal(box.plan.id, 'classico');
  assert.equal(box.titles.length, box.plan.booksPerMonth);
  assert.equal(R.recommendBox({ minutesPerDay: -1 }), null);
});
