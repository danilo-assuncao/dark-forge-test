const test = require('node:test');
const assert = require('assert');
const { 
    listPlans, 
    getPlanById,
    listExtraChannels,
    createProfileManager,
    listRentalMovies,
    quoteRentals,
    RENTAL_PRICES,
    generateProtocol,
    calculateSubscriptionCheckout
} = require('../app.js');

test('app.js exposes plans', () => {
    assert.strictEqual(Array.isArray(listPlans()), true);
    assert.strictEqual(listPlans().length > 0, true);
    const plan = getPlanById('ultra-4k');
    assert.strictEqual(plan.id, 'ultra-4k');
});

test('app.js exposes channels', () => {
    assert.strictEqual(Array.isArray(listExtraChannels()), true);
});

test('app.js exposes profile manager', () => {
    const profileManager = createProfileManager('1234');
    const pId = profileManager.addProfile({ name: 'Test', isKids: false });
    assert.strictEqual(typeof pId, 'string');
});

test('app.js exposes rentals', () => {
    assert.strictEqual(Array.isArray(listRentalMovies()), true);
    assert.strictEqual(listRentalMovies().length > 0, true);
});

test('app.js exposes billing and checkout', () => {
    const protocol = generateProtocol();
    assert.strictEqual(protocol.startsWith('PLY-'), true);

    const checkout = calculateSubscriptionCheckout({
        planId: 'ultra-4k',
        cycle: 'mensal',
        channelIds: ['esportes-live']
    });
    assert.strictEqual(checkout.planId, 'ultra-4k');
    assert.strictEqual(checkout.cycle, 'mensal');
});
