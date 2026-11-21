const test = require('node:test');
const assert = require('node:assert/strict');
const { listSpaces, getSpaceById } = require('../spaces.js');

test('getSpaceById returns correct space by id', () => {
  const hotDesk = getSpaceById('hot-desk');
  assert.equal(hotDesk.id, 'hot-desk');
  assert.equal(hotDesk.hourlyRate, 22.00);
  assert.equal(hotDesk.maxCapacity, 1);

  const salaFocus = getSpaceById('sala-focus-4p');
  assert.equal(salaFocus.id, 'sala-focus-4p');
  assert.equal(salaFocus.hourlyRate, 65.00);
  assert.equal(salaFocus.maxCapacity, 4);

  const auditorio = getSpaceById('auditorio-40p');
  assert.equal(auditorio.id, 'auditorio-40p');
  assert.equal(auditorio.hourlyRate, 320.00);
  assert.equal(auditorio.maxCapacity, 40);

  const notFound = getSpaceById('non-existent');
  assert.equal(notFound, null);
});

test('listSpaces returns all spaces without arguments', () => {
  const spaces = listSpaces();
  assert.equal(spaces.length, 4);
});

test('listSpaces filters by minCapacity', () => {
  const spacesFor2 = listSpaces({ minCapacity: 2 });
  assert.equal(spacesFor2.length, 3);
  assert.ok(spacesFor2.every(s => s.maxCapacity >= 2));

  const spacesFor15 = listSpaces({ minCapacity: 15 });
  assert.equal(spacesFor15.length, 1);
  assert.equal(spacesFor15[0].id, 'auditorio-40p');

  const spacesFor50 = listSpaces({ minCapacity: 50 });
  assert.equal(spacesFor50.length, 0);
});
