const test = require('node:test');
const assert = require('node:assert/strict');
const { listPlans, listExtraChannels, getPlanById } = require('../plans');

test('listPlans should return all monthly plans', () => {
    const plans = listPlans();
    assert.strictEqual(plans.length, 3);

    const padraoAds = plans.find(p => p.id === 'padrao-ads');
    assert.deepStrictEqual(padraoAds, {
        id: 'padrao-ads',
        price: 19.90,
        screens: 2,
        resolution: '1080p'
    });

    const fullHd = plans.find(p => p.id === 'full-hd');
    assert.deepStrictEqual(fullHd, {
        id: 'full-hd',
        price: 39.90,
        screens: 2,
        resolution: '1080p',
        offlineDownloads: true
    });

    const ultra4k = plans.find(p => p.id === 'ultra-4k');
    assert.deepStrictEqual(ultra4k, {
        id: 'ultra-4k',
        price: 55.90,
        screens: 4,
        resolution: '4K HDR',
        dolbyAtmos: true
    });
});

test('listExtraChannels should return all extra channels', () => {
    const channels = listExtraChannels();
    assert.strictEqual(channels.length, 3);

    assert.deepStrictEqual(channels.find(c => c.id === 'esportes-live'), {
        id: 'esportes-live',
        price: 24.90
    });

    assert.deepStrictEqual(channels.find(c => c.id === 'premiere-cinema'), {
        id: 'premiere-cinema',
        price: 19.90
    });

    assert.deepStrictEqual(channels.find(c => c.id === 'kids-plus'), {
        id: 'kids-plus',
        price: 12.90
    });
});

test('getPlanById should return the correct plan', () => {
    const plan = getPlanById('full-hd');
    assert.strictEqual(plan.id, 'full-hd');
    assert.strictEqual(plan.price, 39.90);
    assert.strictEqual(plan.screens, 2);
});

test('listPlans, listExtraChannels and getPlanById should return immutable data', () => {
    const plans = listPlans();
    
    // In strict mode, modifying frozen objects throws a TypeError.
    // We enforce strict mode behavior locally to ensure exceptions are thrown.
    assert.throws(() => {
        'use strict';
        plans.push({});
    }, TypeError);

    const plan = getPlanById('full-hd');
    assert.throws(() => {
        'use strict';
        plan.price = 0;
    }, TypeError);

    const channels = listExtraChannels();
    assert.throws(() => {
        'use strict';
        channels.push({});
    }, TypeError);
});

test('getPlanById should handle boundary inputs', () => {
    const boundaryInputs = [undefined, null, '', 'FULL-HD', 123];
    boundaryInputs.forEach(input => {
        assert.strictEqual(getPlanById(input), undefined);
    });
});

test('Catalog data should maintain structural invariants', () => {
    const plans = listPlans();
    const channels = listExtraChannels();

    const planIds = new Set();
    plans.forEach(plan => {
        assert.ok(!planIds.has(plan.id), `Duplicate plan id: ${plan.id}`);
        planIds.add(plan.id);
        assert.ok(typeof plan.price === 'number' && plan.price > 0 && isFinite(plan.price), `Invalid price for plan ${plan.id}`);
        assert.deepStrictEqual(getPlanById(plan.id), plan);
    });

    const channelIds = new Set();
    channels.forEach(channel => {
        assert.ok(!channelIds.has(channel.id), `Duplicate channel id: ${channel.id}`);
        channelIds.add(channel.id);
        assert.ok(typeof channel.price === 'number' && channel.price > 0 && isFinite(channel.price), `Invalid price for channel ${channel.id}`);
    });
});

