'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../calculator.js');
const catalog = require('../products.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const man = { sex: 'M', weightKg: 80, heightCm: 180, age: 30, activity: 'moderado' };
const woman = { sex: 'F', weightKg: 60, heightCm: 165, age: 25 };

test('computes BMI and category', () => {
  assert.equal(calc.bmi(80, 180), 24.7);
  assert.equal(calc.bmiCategory(17), 'Abaixo do peso');
  assert.equal(calc.bmiCategory(24.7), 'Peso normal');
  assert.equal(calc.bmiCategory(27), 'Sobrepeso');
  assert.equal(calc.bmiCategory(31), 'Obesidade');
});

test('bmiCategory boundaries', () => {
  const cases = [[18.4, 'Abaixo do peso'], [18.5, 'Peso normal'], [24.9, 'Peso normal'],
    [25, 'Sobrepeso'], [29.9, 'Sobrepeso'], [30, 'Obesidade']];
  for (const [v, c] of cases) { assert.equal(calc.bmiCategory(v), c, String(v)); }
});

test('calculate classifies from the unrounded BMI', () => {
  // ~24.97 BMI: rounds to 25 but is still below the threshold
  const r = calc.calculate({ sex: 'M', weightKg: 80.9, heightCm: 180, age: 30 }, 'Saude');
  assert.equal(r.bmi, 25);
  assert.equal(r.bmiCategory, 'Peso normal');
});

test('computes BMR with Mifflin-St Jeor', () => {
  assert.equal(calc.bmr(man), 1780);
  assert.equal(calc.bmr(woman), 1345);
  assert.equal(calc.tdee(man), Math.round(1780 * 1.55));
  assert.equal(calc.tdee(woman), Math.round(1345 * 1.2));
});

test('tdee defaults to sedentario when activity is omitted', () => {
  assert.equal(calc.tdee({ ...man, activity: undefined }), Math.round(1780 * 1.2));
  assert.throws(() => calc.tdee({ ...man, activity: '' }), RangeError);
  assert.throws(() => calc.tdee({ ...man, activity: null }), RangeError);
});

test('daily targets per goal', () => {
  assert.equal(calc.tdee(man), 2759);
  assert.deepEqual(calc.dailyTargets(man, 'Hipertrofia'), { goal: 'Hipertrofia', kcal: 3173, proteinG: 160 });
  assert.deepEqual(calc.dailyTargets(man, 'Emagrecimento'), { goal: 'Emagrecimento', kcal: 2207, proteinG: 160 });
  assert.deepEqual(calc.dailyTargets(man, 'Saude'), { goal: 'Saude', kcal: 2759, proteinG: 112 });
});

test('suggests compatible catalog items', () => {
  for (const goal of catalog.goals) {
    const items = calc.suggestProducts(goal);
    assert.ok(items.length > 0);
    assert.ok(items.every((p) => p.goals.includes(goal)));
  }
  const prot = calc.suggestProducts('Hipertrofia', { category: 'Proteinas' });
  assert.ok(prot.length > 0);
  assert.ok(prot.every((p) => p.category === 'Proteinas' && p.goals.includes('Hipertrofia')));
  assert.deepEqual(calc.suggestProducts('Saude', { category: 'Inexistente' }), []);
  const vit = calc.suggestProducts('Emagrecimento', { category: 'Vitaminas & Longevidade' });
  assert.ok(vit.length > 0);
  assert.ok(vit.every((p) => p.category === 'Vitaminas & Longevidade' && p.goals.includes('Emagrecimento')));
});

test('every activity multiplier is applied', () => {
  const expected = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, muito_intenso: 1.9 };
  assert.deepEqual({ ...calc.activityLevels }, expected);
  for (const [level, factor] of Object.entries(expected)) {
    assert.equal(calc.tdee({ ...man, activity: level }), Math.round(1780 * factor), level);
  }
});

test('accepts inputs exactly at the limits and rejects tiny ones', () => {
  assert.doesNotThrow(() => calc.bmi(500, 300));
  assert.doesNotThrow(() => calc.bmi(2, 30));
  assert.doesNotThrow(() => calc.bmr({ ...man, age: 120 }));
  assert.doesNotThrow(() => calc.bmr({ ...man, age: 1 }));
  assert.equal(calc.bmiCategory(0), 'Abaixo do peso');
  assert.throws(() => calc.bmi(80, 0.001), RangeError);
  assert.throws(() => calc.bmi(0.1, 180), RangeError);
  assert.throws(() => calc.bmr({ ...man, age: 0.1 }), RangeError);
});

test('rejects invalid input', () => {
  const bad = [0, -1, NaN, Infinity, '80', null, undefined];
  for (const v of bad) {
    assert.throws(() => calc.bmi(v, 180), RangeError, 'weight ' + String(v));
    assert.throws(() => calc.bmi(80, v), RangeError, 'height ' + String(v));
    assert.throws(() => calc.bmr({ ...man, weightKg: v }), RangeError);
    assert.throws(() => calc.bmr({ ...man, heightCm: v }), RangeError);
    assert.throws(() => calc.bmr({ ...man, age: v }), RangeError);
  }
  assert.throws(() => calc.bmr({ ...man, age: 121 }), RangeError);
  assert.throws(() => calc.bmr({ ...man, weightKg: 501 }), RangeError);
  assert.throws(() => calc.bmr({ ...man, heightCm: 301 }), RangeError);
  assert.throws(() => calc.bmr({ sex: 'F', weightKg: 1, heightCm: 1, age: 120 }), RangeError);
  for (const p of [undefined, null, {}]) {
    assert.throws(() => calc.bmr(p), RangeError);
    assert.throws(() => calc.tdee(p), RangeError);
    assert.throws(() => calc.dailyTargets(p, 'Saude'), RangeError);
    assert.throws(() => calc.calculate(p, 'Saude'), RangeError);
  }
  assert.throws(() => calc.bmr({ ...man, sex: 'X' }), RangeError);
  assert.throws(() => calc.tdee({ ...man, activity: 'x' }), RangeError);
  assert.throws(() => calc.dailyTargets(man, 'Nope'), RangeError);
  assert.throws(() => calc.calculate(man, 'Nope'), RangeError);
  assert.throws(() => calc.suggestProducts('Nope'), RangeError);
});

test('activity levels table is frozen', () => {
  assert.ok(Object.isFrozen(calc.activityLevels));
});

test('calculate aggregates everything', () => {
  const r = calc.calculate(man, 'Saude');
  assert.equal(r.bmi, 24.7);
  assert.equal(r.bmr, 1780);
  assert.equal(r.targets.goal, 'Saude');
  assert.ok(r.suggestions.length > 0);
});

test('bmiCategory rejects invalid values', () => {
  for (const v of [NaN, undefined, null, '25', Infinity, -1]) {
    assert.throws(() => calc.bmiCategory(v), RangeError, String(v));
  }
});

test('bmiClassification uses the unrounded BMI', () => {
  assert.equal(calc.bmi(80.9, 180), 25);
  assert.equal(calc.bmiClassification(80.9, 180), 'Peso normal');
  assert.throws(() => calc.bmiClassification(0, 180), RangeError);
});

test('lookup tables ignore inherited prototype keys', () => {
  for (const k of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    assert.throws(() => calc.tdee({ ...man, activity: k }), RangeError, k);
    assert.throws(() => calc.dailyTargets(man, k), RangeError, k);
    assert.throws(() => calc.suggestProducts(k), RangeError, k);
  }
});

test('female profile through dailyTargets and calculate', () => {
  assert.equal(calc.tdee(woman), 1614);
  assert.deepEqual(calc.dailyTargets(woman, 'Emagrecimento'), { goal: 'Emagrecimento', kcal: 1291, proteinG: 120 });
  const r = calc.calculate(woman, 'Hipertrofia');
  assert.equal(r.bmr, 1345);
  assert.equal(r.bmi, 22);
  assert.equal(r.targets.kcal, 1856);
});

test('goal and profile fields are required', () => {
  for (const g of [undefined, null, '']) {
    assert.throws(() => calc.dailyTargets(man, g), RangeError);
    assert.throws(() => calc.calculate(man, g), RangeError);
    assert.throws(() => calc.suggestProducts(g), RangeError);
  }
  assert.throws(() => calc.calculate({ ...man, activity: 'x' }, 'Saude'), RangeError);
  assert.throws(() => calc.calculate({ ...man, sex: 'X' }, 'Saude'), RangeError);
});

test('exposes window.DanNutriCalculator when loaded in a browser-like context', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'calculator.js'), 'utf8');
  const win = { DanNutriProducts: catalog };
  vm.runInNewContext(src, { window: win });
  assert.ok(win.DanNutriCalculator);
  assert.equal(win.DanNutriCalculator.bmr(man), 1780);
  assert.ok(win.DanNutriCalculator.suggestProducts('Saude').length > 0);
});
