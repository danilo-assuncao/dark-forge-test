'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../classes.js');

test('catalog has the four required modalities', () => {
  assert.deepEqual(A.CLASSES.map((c) => c.name), ['Forca & Funcional', 'Spinning', 'Yoga & Mobilidade', 'Boxe']);
});

test('every class has valid duration, calories, capacity, intensity and instructors', () => {
  for (const c of A.CLASSES) {
    assert.ok(c.durationMin > 0 && Number.isInteger(c.durationMin), c.id);
    assert.ok(c.caloriesPerSession > 0, c.id);
    assert.ok(c.capacity > 0 && Number.isInteger(c.capacity), c.id);
    assert.ok(A.getIntensity(c.intensity), c.id);
    assert.ok(c.instructors.length > 0, c.id);
    for (const i of c.instructors) assert.ok(A.getInstructor(i), `${c.id} -> ${i}`);
  }
});

test('ids are unique and instructor specialties reference real classes', () => {
  for (const list of [A.CLASSES, A.INSTRUCTORS, A.INTENSITIES]) {
    assert.equal(new Set(list.map((x) => x.id)).size, list.length);
  }
  for (const i of A.INSTRUCTORS) for (const s of i.specialties) assert.ok(A.getClass(s));
});

test('instructor/class links are consistent both ways', () => {
  for (const c of A.CLASSES) {
    for (const i of A.instructorsFor(c.id)) assert.ok(i.specialties.includes(c.id));
  }
  for (const i of A.INSTRUCTORS) {
    for (const s of i.specialties) assert.ok(A.getClass(s).instructors.includes(i.id), `${i.id} -> ${s}`);
  }
  assert.deepEqual(A.classesByInstructor('bruno-tavares').map((c) => c.id), ['forca-funcional', 'boxe']);
  assert.deepEqual(A.instructorsFor('nope'), []);
});

test('intensity filter and ordering', () => {
  assert.deepEqual(A.classesByIntensity('leve').map((c) => c.id), ['yoga-mobilidade']);
  assert.deepEqual(A.classesByIntensity('alta').map((c) => c.id), ['forca-funcional', 'spinning']);
  assert.ok(A.getIntensity('leve').level < A.getIntensity('alta').level);
});

test('lookup and filter miss paths return null or empty', () => {
  assert.equal(A.getClass('nope'), null);
  assert.equal(A.getInstructor('nope'), null);
  assert.equal(A.getIntensity('nope'), null);
  assert.deepEqual(A.classesByIntensity('x'), []);
  assert.deepEqual(A.classesByInstructor('x'), []);
});

test('caloriesPerMinute rounds to one decimal for every class', () => {
  const expected = { 'forca-funcional': 9, spinning: 12.2, 'yoga-mobilidade': 3.3, boxe: 9.1 };
  for (const c of A.CLASSES) assert.equal(A.caloriesPerMinute(c.id), expected[c.id], c.id);
  assert.equal(A.caloriesPerMinute('nope'), null);
});

test('spotsLeft handles boundaries and fails closed', () => {
  assert.equal(A.spotsLeft('boxe', 0), 16);
  assert.equal(A.spotsLeft('boxe', 10), 6);
  assert.equal(A.spotsLeft('boxe', 16), 0);
  assert.equal(A.spotsLeft('boxe', 99), 0);
  assert.equal(A.spotsLeft('boxe', 10.9), 6);
  assert.equal(A.spotsLeft('boxe', 2.9), 14);
  assert.equal(A.spotsLeft('boxe', -3), 16);
  assert.equal(A.spotsLeft('boxe', Infinity), 0);
  assert.equal(A.spotsLeft('boxe', -Infinity), 16);
  for (const bad of [null, undefined, '', NaN, 'abc']) assert.equal(A.spotsLeft('boxe', bad), null);
  assert.equal(A.spotsLeft('nope', 1), null);
});
