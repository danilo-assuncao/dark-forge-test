'use strict';

function resolveZoneRate(cepPrefix) {
  if (typeof cepPrefix !== 'string') {
    throw new TypeError('CEP prefix must be a string');
  }
  if (cepPrefix.length !== 2 || !/^[0-9]{2}$/.test(cepPrefix) || cepPrefix === '00') {
    throw new RangeError('CEP prefix must contain two digits from 01 to 99');
  }

  const prefix = Number(cepPrefix);
  if (prefix <= 19) return { zone: 'SP', baseBrl: 15.0 };
  if (prefix <= 28) return { zone: 'RJ', baseBrl: 20.0 };
  return { zone: 'BR', baseBrl: 30.0 };
}

module.exports = { resolveZoneRate };
