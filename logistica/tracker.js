'use strict';

function formatTrackingCode(seq) {
  if (!Number.isInteger(seq) || seq <= 0) {
    throw new RangeError('sequence must be a positive integer');
  }

  return 'LOG-' + String(seq).padStart(4, '0');
}

module.exports = { formatTrackingCode };
