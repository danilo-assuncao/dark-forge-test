'use strict';

function responseDeadlineHours(priority) {
  switch (priority) {
    case 'critical':
      return 1;
    case 'high':
      return 4;
    case 'normal':
      return 24;
    default:
      throw new RangeError('priority must be critical, high, or normal');
  }
}

module.exports = { responseDeadlineHours };
