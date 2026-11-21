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

test('getPlanById should return undefined for an unknown plan id', () => {
    const plan = getPlanById('unknown-plan');
    assert.strictEqual(plan, undefined);
});
