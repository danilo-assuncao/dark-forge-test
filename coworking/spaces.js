const spaces = [
  {
    id: 'hot-desk',
    name: 'Hot Desk',
    hourlyRate: 22.00,
    maxCapacity: 1
  },
  {
    id: 'sala-focus-4p',
    name: 'Sala Focus 4P',
    hourlyRate: 65.00,
    maxCapacity: 4
  },
  {
    id: 'sala-board-12p',
    name: 'Sala Board 12P',
    hourlyRate: 145.00,
    maxCapacity: 12
  },
  {
    id: 'auditorio-40p',
    name: 'Auditório 40P',
    hourlyRate: 320.00,
    maxCapacity: 40
  }
];

function listSpaces({ minCapacity = 1 } = {}) {
  return spaces.filter(space => space.maxCapacity >= minCapacity);
}

function getSpaceById(spaceId) {
  return spaces.find(space => space.id === spaceId) || null;
}

module.exports = {
  listSpaces,
  getSpaceById
};
