'use strict';

function assertFinite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number`);
    }
}

const KM_PER_MILE = 1.609344;

function cToF(c) {
    assertFinite(c, 'c');
    return (c * 9) / 5 + 32;
}

function fToC(f) {
    assertFinite(f, 'f');
    return ((f - 32) * 5) / 9;
}

function kmToMiles(km) {
    assertFinite(km, 'km');
    return km / KM_PER_MILE;
}

function milesToKm(mi) {
    assertFinite(mi, 'mi');
    return mi * KM_PER_MILE;
}

module.exports = { cToF, fToC, kmToMiles, milesToKm };
