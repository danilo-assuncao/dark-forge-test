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
  assert.ok(L.filterListings({ neighborhood: 'butanta' }).every((l) => l.neighborhood === 'Butantã'));
  assert.ok(L.filterListings({ q: 'JARDINS' }).length >= 2);
  assert.ok(L.filterListings({ minArea: 100 }).every((l) => l.areaM2 >= 100));
  assert.ok(L.filterListings({ maxPrice: 300000, modality: 'aluguel' }).every((l) => l.price <= 300000));
  assert.deepEqual(L.filterListings({ minParking: 99 }), []);
});

test('monthlyCost: rent plus fees for rentals, fees only for sales', () => {
  assert.equal(L.monthlyCost(L.byId('apt-003')), 520000 + 95000 + 34000);
  assert.equal(L.monthlyCost(L.byId('apt-001')), 128000 + 52000);
  assert.equal(L.monthlyCost(L.byId('cas-001')), 61000);
});

test('pricePerM2 and formatters', () => {
  assert.equal(L.pricePerM2(L.byId('apt-001')), Math.round(125000000 / 98));
  assert.equal(L.formatBRL(125000000), 'R$ 1.250.000,00');
  assert.equal(L.formatBRL(52000), 'R$ 520,00');
  assert.equal(L.formatArea(98), '98 m²');
  assert.equal(L.byId('nope'), null);
});
