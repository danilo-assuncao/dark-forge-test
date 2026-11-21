'use strict';

const spaces = Object.freeze([
  Object.freeze({
    id: 'hot-desk',
    name: 'Hot Desk',
    hourlyRate: 22.00,
    maxCapacity: 1
  }),
  Object.freeze({
    id: 'sala-focus-4p',
    name: 'Sala Focus 4P',
    hourlyRate: 65.00,
    maxCapacity: 4
  }),
  Object.freeze({
    id: 'sala-board-12p',
    name: 'Sala Board 12P',
    hourlyRate: 145.00,
    maxCapacity: 12
  }),
  Object.freeze({
    id: 'auditorio-40p',
    name: 'Auditório 40P',
    hourlyRate: 320.00,
    maxCapacity: 40
  })
]);

function listSpaces(options) {
  const { minCapacity = 1 } = options ?? {};
  
  if (typeof minCapacity !== 'number' || !Number.isFinite(minCapacity)) {
    throw new TypeError('minCapacity must be a finite number');
  }
  
  if (minCapacity < 0) {
    throw new RangeError('minCapacity cannot be negative');
  }

  return spaces.filter(space => space.maxCapacity >= minCapacity);
}

function getSpaceById(spaceId) {
  return spaces.find(space => space.id === spaceId) || null;
}

module.exports = {
  listSpaces,
  getSpaceById
};
