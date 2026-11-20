'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cToF, fToC, kmToMiles, milesToKm } = require('../units');

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !~ ${b}`);

test('cToF', () => {
    assert.equal(cToF(0), 32);
    assert.equal(cToF(100), 212);
    assert.equal(cToF(-40), -40);
});

test('fToC', () => {
    assert.equal(fToC(32), 0);
    assert.equal(fToC(212), 100);
    assert.equal(fToC(-40), -40);
});

test('kmToMiles', () => {
    assert.equal(kmToMiles(0), 0);
    close(kmToMiles(1.609344), 1);
    close(kmToMiles(10), 6.2137119224);
});

test('milesToKm', () => {
    assert.equal(milesToKm(0), 0);
    close(milesToKm(1), 1.609344);
    close(milesToKm(kmToMiles(42)), 42);
});

test('rejects non-finite or non-number input with TypeError', () => {
    for (const fn of [cToF, fToC, kmToMiles, milesToKm]) {
        for (const bad of [NaN, Infinity, -Infinity, '1', null, undefined, {}, [], true]) {
            assert.throws(
                () => fn(bad),
                { name: 'TypeError', message: /finite number/ },
                `${fn.name}(${String(bad)}) should throw TypeError`
            );
        }
    }
});

test('throws RangeError when a finite input overflows the result', () => {
    for (const fn of [cToF, milesToKm]) {
        for (const big of [Number.MAX_VALUE, -Number.MAX_VALUE]) {
            assert.throws(() => fn(big), { name: 'RangeError' }, `${fn.name}(${big})`);
        }
    }
});

test('handles negative distances and preserves -0', () => {
    close(kmToMiles(-1.609344), -1);
    close(milesToKm(-1), -1.609344);
    assert.ok(Object.is(kmToMiles(-0), -0));
    assert.ok(Object.is(milesToKm(-0), -0));
});
