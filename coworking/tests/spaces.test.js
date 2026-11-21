'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { listSpaces, getSpaceById } = require('../spaces.js');

test('getSpaceById returns correct space for valid ids', () => {
  const hotDesk = getSpaceById('hot-desk');
  assert.equal(hotDesk.id, 'hot-desk');
  assert.equal(hotDesk.hourlyRate, 22.00);
  assert.equal(hotDesk.maxCapacity, 1);

  const salaFocus = getSpaceById('sala-focus-4p');
  assert.equal(salaFocus.id, 'sala-focus-4p');
  assert.equal(salaFocus.hourlyRate, 65.00);
  assert.equal(salaFocus.maxCapacity, 4);

  const salaBoard = getSpaceById('sala-board-12p');
  assert.equal(salaBoard.id, 'sala-board-12p');
  assert.equal(salaBoard.hourlyRate, 145.00);
  assert.equal(salaBoard.maxCapacity, 12);

  const auditorio = getSpaceById('auditorio-40p');
  assert.equal(auditorio.id, 'auditorio-40p');
  assert.equal(auditorio.hourlyRate, 320.00);
  assert.equal(auditorio.maxCapacity, 40);
});

test('getSpaceById returns null for missing or invalid ids', () => {
  assert.equal(getSpaceById('non-existent'), null);
  assert.equal(getSpaceById(''), null);
  assert.equal(getSpaceById(undefined), null);
});

test('spaces are immutable and cannot be mutated by callers', () => {
  const hotDesk = getSpaceById('hot-desk');
  assert.ok(Object.isFrozen(hotDesk), 'Space objects should be frozen');
  assert.throws(() => {
    hotDesk.hourlyRate = 0;
  }, TypeError);
  assert.equal(hotDesk.hourlyRate, 22.00);
});

test('listSpaces returns all spaces when called with no options or undefined/null', () => {
  const expectedIds = ['hot-desk', 'sala-focus-4p', 'sala-board-12p', 'auditorio-40p'];
  
  assert.deepEqual(listSpaces().map(s => s.id), expectedIds);
  assert.deepEqual(listSpaces(undefined).map(s => s.id), expectedIds);
  assert.deepEqual(listSpaces(null).map(s => s.id), expectedIds);
});

test('listSpaces filters correctly with minCapacity edge and exact boundaries', () => {
  assert.deepEqual(
    listSpaces({ minCapacity: 0 }).map(s => s.id),
    ['hot-desk', 'sala-focus-4p', 'sala-board-12p', 'auditorio-40p']
  );

  assert.deepEqual(
    listSpaces({ minCapacity: 2 }).map(s => s.id),
    ['sala-focus-4p', 'sala-board-12p', 'auditorio-40p']
  );

  assert.deepEqual(
    listSpaces({ minCapacity: 4 }).map(s => s.id),
    ['sala-focus-4p', 'sala-board-12p', 'auditorio-40p']
  );

  assert.deepEqual(
    listSpaces({ minCapacity: 12 }).map(s => s.id),
    ['sala-board-12p', 'auditorio-40p']
  );
  
  assert.deepEqual(
    listSpaces({ minCapacity: 40 }).map(s => s.id),
    ['auditorio-40p']
  );
  
  assert.deepEqual(
    listSpaces({ minCapacity: 41 }).map(s => s.id),
    []
  );
});

test('listSpaces validates minCapacity and throws on invalid input', () => {
  assert.throws(() => listSpaces({ minCapacity: null }), TypeError);
  assert.throws(() => listSpaces({ minCapacity: '4' }), TypeError);
  assert.throws(() => listSpaces({ minCapacity: NaN }), TypeError);
  assert.throws(() => listSpaces({ minCapacity: -1 }), RangeError);
});
