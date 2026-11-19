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
  assert.deepEqual(A.classesByInstructor('bruno-tavares').map((c) => c.id), ['forca-funcional', 'boxe']);
  assert.deepEqual(A.instructorsFor('nope'), []);
});

test('intensity filter and ordering', () => {
  assert.deepEqual(A.classesByIntensity('leve').map((c) => c.id), ['yoga-mobilidade']);
  assert.deepEqual(A.classesByIntensity('alta').map((c) => c.id), ['forca-funcional', 'spinning']);
  assert.ok(A.getIntensity('leve').level < A.getIntensity('alta').level);
});

test('caloriesPerMinute and spotsLeft', () => {
  assert.equal(A.caloriesPerMinute('spinning'), 12.2);
  assert.equal(A.caloriesPerMinute('nope'), null);
  assert.equal(A.spotsLeft('boxe', 10), 6);
  assert.equal(A.spotsLeft('boxe', 99), 0);
  assert.equal(A.spotsLeft('boxe', -3), 16);
  assert.equal(A.spotsLeft('boxe', 'abc'), 16);
  assert.equal(A.spotsLeft('nope', 1), null);
});
