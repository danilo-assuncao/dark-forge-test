'use strict';

const { createHash } = require('node:crypto');

function sha256Hex(input) {
  if (typeof input !== 'string') {
    throw new TypeError('input must be a string');
  }

  return createHash('sha256').update(input, 'utf8').digest('hex');
}

module.exports = { sha256Hex };
