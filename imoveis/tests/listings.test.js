'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../listings.js');

test('covers every type and modality', () => {
  assert.deepEqual(L.TYPES.map((t) => t.name), ['Apartamento', 'Casa', 'Studio', 'Sala Comercial']);
  assert.deepEqual(L.MODALITIES.map((m) => m.name), ['Venda', 'Aluguel']);
  L.TYPES.forEach((t) => L.MODALITIES.forEach((m) =>
    assert.ok(L.filterListings({ type: t.id, modality: m.id }).length > 0, t.id + '/' + m.id)));
});

test('listings are well formed with unique ids', () => {
  const ids = new Set();
  L.LISTINGS.forEach((l) => {
    assert.ok(!ids.has(l.id), 'duplicate ' + l.id);
    ids.add(l.id);
    assert.ok(L.typeById(l.type), l.id + ' type');
    assert.ok(L.MODALITIES.some((m) => m.id === l.modality), l.id + ' modality');
    assert.ok(L.NEIGHBORHOODS.includes(l.neighborhood), l.id + ' neighborhood');
    assert.ok(l.areaM2 > 0, l.id + ' area');
    ['bedrooms', 'parking', 'condo', 'iptu'].forEach((k) =>
      assert.ok(Number.isInteger(l[k]) && l[k] >= 0, l.id + ' ' + k));
    assert.ok(Number.isInteger(l.price) && l.price > 0, l.id + ' price');
  });
});

test('studios and commercial rooms have no bedrooms', () => {
  L.LISTINGS.filter((l) => l.type === 'studio' || L.isCommercial(l))
    .forEach((l) => assert.equal(l.bedrooms, 0, l.id));
  assert.equal(L.isCommercial(L.byId('com-001')), true);
  assert.equal(L.isCommercial(L.byId('apt-001')), false);
});

test('filterListings combines filters and ignores accents', () => {
  assert.equal(L.filterListings().length, L.LISTINGS.length);
  const r = L.filterListings({ type: 'apartamento', modality: 'aluguel', minBedrooms: 2 });
  assert.deepEqual(r.map((l) => l.id), ['apt-003']);
  const ids = (f) => L.filterListings(f).map((l) => l.id);
  assert.deepEqual(ids({ neighborhood: 'butanta' }), ['cas-001']);
  assert.deepEqual(ids({ q: 'tatuape' }), ['apt-004', 'cas-003']);
  assert.deepEqual(ids({ q: 'JARDINS' }), ['apt-005', 'com-002']);
  assert.deepEqual(ids({ minArea: 100 }), ['apt-005', 'cas-001', 'cas-002', 'cas-003']);
  assert.deepEqual(ids({ maxPrice: 300000, modality: 'aluguel' }), ['apt-004', 'stu-001', 'stu-003', 'com-003']);
  assert.deepEqual(ids({ minParking: 99 }), []);
});

test('filterListings boundaries are inclusive', () => {
  const ids = (f) => L.filterListings(f).map((l) => l.id);
  assert.ok(ids({ minArea: 98 }).includes('apt-001'));
  assert.ok(!ids({ minArea: 99 }).includes('apt-001'));
  assert.deepEqual(ids({ maxArea: 24 }), ['stu-003']);
  assert.ok(ids({ maxPrice: 280000, modality: 'aluguel' }).includes('apt-004'));
  assert.ok(!ids({ maxPrice: 279999, modality: 'aluguel' }).includes('apt-004'));
  assert.ok(ids({ minBedrooms: 4 }).includes('apt-005'));
  assert.ok(!ids({ minBedrooms: 5 }).includes('apt-005'));
  assert.ok(ids({ minParking: 3 }).includes('apt-005'));
  assert.equal(ids({ minBedrooms: 0 }).length, L.LISTINGS.length);
});

test('filterListings ignores invalid numerics and rejects unknown values', () => {
  const all = L.LISTINGS.length;
  [NaN, '100', null, undefined, Infinity].forEach((v) => {
    assert.equal(L.filterListings({ minArea: v }).length, all, String(v));
  });
  assert.equal(L.filterListings({ q: '', neighborhood: '' }).length, all);
  assert.deepEqual(L.filterListings({ type: 'nope' }), []);
  assert.deepEqual(L.filterListings({ modality: 'nope' }), []);
});

test('monthlyCost: rent plus fees for rentals, fees only for sales', () => {
  assert.equal(L.monthlyCost(L.byId('apt-003')), 649000);
  assert.equal(L.monthlyCost(L.byId('apt-001')), 180000);
  assert.equal(L.monthlyCost(L.byId('cas-001')), 61000);
  // rental with zero condo
  assert.equal(L.monthlyCost(L.byId('cas-002')), 892000);
});

test('pricePerM2 uses literal values and rounds half up', () => {
  assert.equal(L.pricePerM2(L.byId('apt-001')), 1275510);
  assert.equal(L.pricePerM2({ price: 5, areaM2: 2 }), 3);
  assert.equal(L.pricePerM2({ price: 7, areaM2: 3 }), 2);
});

test('lookups and isCommercial handle unknown values', () => {
  assert.equal(L.byId('nope'), null);
  assert.equal(L.typeById('x'), null);
  assert.equal(L.isCommercial({ type: 'x' }), false);
});

test('formatBRL edge cases', () => {
  assert.equal(L.formatBRL(0), 'R$ 0,00');
  assert.equal(L.formatBRL(1), 'R$ 0,01');
  assert.equal(L.formatBRL(52000), 'R$ 520,00');
  assert.equal(L.formatBRL(99999), 'R$ 999,99');
  assert.equal(L.formatBRL(100000), 'R$ 1.000,00');
  assert.equal(L.formatBRL(125000000), 'R$ 1.250.000,00');
  assert.equal(L.formatBRL(-123456), 'R$ -1.234,56');
});

test('formatArea', () => {
  assert.equal(L.formatArea(98), '98 m²');
  assert.equal(L.formatArea(28.5), '28,5 m²');
});
