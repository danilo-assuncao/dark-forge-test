'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../calculator.js');
const catalog = require('../products.js');

const man = { sex: 'M', weightKg: 80, heightCm: 180, age: 30, activity: 'moderado' };
const woman = { sex: 'F', weightKg: 60, heightCm: 165, age: 25 };

test('computes BMI and category', () => {
  assert.equal(calc.bmi(80, 180), 24.7);
  assert.equal(calc.bmiCategory(17), 'Abaixo do peso');
  assert.equal(calc.bmiCategory(24.7), 'Peso normal');
  assert.equal(calc.bmiCategory(27), 'Sobrepeso');
  assert.equal(calc.bmiCategory(31), 'Obesidade');
});

test('computes BMR with Mifflin-St Jeor', () => {
  assert.equal(calc.bmr(man), 1780);
  assert.equal(calc.bmr(woman), 1345);
  assert.equal(calc.tdee(man), Math.round(1780 * 1.55));
  assert.equal(calc.tdee(woman), Math.round(1345 * 1.2));
});

test('daily targets per goal', () => {
  const tdee = calc.tdee(man);
  assert.deepEqual(calc.dailyTargets(man, 'Hipertrofia'), { goal: 'Hipertrofia', kcal: Math.round(tdee * 1.15), proteinG: 160 });
  assert.deepEqual(calc.dailyTargets(man, 'Emagrecimento'), { goal: 'Emagrecimento', kcal: Math.round(tdee * 0.8), proteinG: 160 });
  assert.deepEqual(calc.dailyTargets(man, 'Saude'), { goal: 'Saude', kcal: tdee, proteinG: 112 });
});

test('suggests compatible catalog items', () => {
  for (const goal of catalog.goals) {
    const items = calc.suggestProducts(goal);
    assert.ok(items.length > 0);
    assert.ok(items.every((p) => p.goals.includes(goal)));
  }
  const prot = calc.suggestProducts('Hipertrofia', { category: 'Proteinas' });
  assert.deepEqual(prot.map((p) => p.id), ['whey-concentrado', 'whey-isolado']);
});

test('rejects invalid input', () => {
  assert.throws(() => calc.bmi(0, 180), RangeError);
  assert.throws(() => calc.bmr({ ...man, sex: 'X' }), RangeError);
  assert.throws(() => calc.tdee({ ...man, activity: 'x' }), RangeError);
  assert.throws(() => calc.dailyTargets(man, 'Nope'), RangeError);
  assert.throws(() => calc.suggestProducts('Nope'), RangeError);
});

test('calculate aggregates everything', () => {
  const r = calc.calculate(man, 'Saude');
  assert.equal(r.bmi, 24.7);
  assert.equal(r.bmr, 1780);
  assert.equal(r.targets.goal, 'Saude');
  assert.ok(r.suggestions.length > 0);
});
