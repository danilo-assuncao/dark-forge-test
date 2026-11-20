'use strict';

function assertFinite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number`);
    }
}

function assertFiniteResult(result, name) {
    if (!Number.isFinite(result)) {
        throw new RangeError(`${name} result is out of range`);
    }
    return result;
}

const KM_PER_MILE = 1.609344;

function cToF(c) {
    assertFinite(c, 'c');
    return assertFiniteResult(c * 1.8 + 32, 'cToF');
}

function fToC(f) {
    assertFinite(f, 'f');
    return assertFiniteResult(((f - 32) * 5) / 9, 'fToC');
}

function kmToMiles(km) {
    assertFinite(km, 'km');
    return assertFiniteResult(km / KM_PER_MILE, 'kmToMiles');
}

function milesToKm(mi) {
    assertFinite(mi, 'mi');
    return assertFiniteResult(mi * KM_PER_MILE, 'milesToKm');
}

module.exports = { cToF, fToC, kmToMiles, milesToKm };
