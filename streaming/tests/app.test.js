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

test('Catalog data (plans, channels) existence and immutable contract', () => {
    const plans = listPlans();
    assert.strictEqual(Array.isArray(plans), true);
    assert.strictEqual(plans.length, 3);
    assert.throws(() => { plans.push({}); }, /Cannot add property|object is not extensible/);

    const channels = listExtraChannels();
    assert.strictEqual(Array.isArray(channels), true);
    assert.strictEqual(channels.length, 3);
    assert.throws(() => { channels.push({}); }, /Cannot add property|object is not extensible/);

    const plan = getPlanById('ultra-4k');
    assert.strictEqual(plan.id, 'ultra-4k');
    assert.strictEqual(plan.price, 55.90);

    const unknown = getPlanById('nope');
    assert.strictEqual(unknown, undefined);
});

test('generateProtocol format and randomness', () => {
    const p1 = generateProtocol();
    const p2 = generateProtocol();
    assert.match(p1, /^PLY-[A-Z0-9]{6}$/);
    assert.match(p2, /^PLY-[A-Z0-9]{6}$/);
    assert.notStrictEqual(p1, p2);
});

test('Profile manager rules (kids clamp, limit, PIN, ratings)', () => {
    assert.throws(() => createProfileManager('123'), /Invalid account PIN/);
    const pm = createProfileManager('1234');
    
    // Add kid profile and check rating clamp to 10
    const kidId = pm.addProfile({ name: 'Kid', isKids: true, maxRating: '18' });
    const profiles = pm.listProfiles();
    const kid = profiles.find(p => p.id === kidId);
    assert.strictEqual(kid.maxRating, '10');

    // Add up to limit
    pm.addProfile({ name: 'P2', isKids: false, maxRating: '12' });
    pm.addProfile({ name: 'P3', isKids: false, maxRating: '14' });
    pm.addProfile({ name: 'P4', isKids: false, maxRating: '16' });
    pm.addProfile({ name: 'P5', isKids: false, maxRating: '18' });
    assert.throws(() => pm.addProfile({ name: 'P6', isKids: false }), /Maximum of 5 profiles/);

    // Validation
    const pm2 = createProfileManager('1234');
    assert.throws(() => pm2.addProfile({ name: '', isKids: false }), /Name must be a non-empty/);
    assert.throws(() => pm2.addProfile({ name: 'P', isKids: 'no' }), /isKids must be a boolean/);
    assert.throws(() => pm2.addProfile({ name: 'P', isKids: false, maxRating: '20' }), /Invalid rating/);

    // canWatchContent
    assert.strictEqual(pm.canWatchContent(kidId, 'L'), true);
    assert.strictEqual(pm.canWatchContent(kidId, '10'), true);
    assert.strictEqual(pm.canWatchContent(kidId, '12'), false);

    // unlockParentalSettings
    assert.strictEqual(pm.unlockParentalSettings(kidId, '9999'), false); // wrong PIN
    assert.strictEqual(pm.canWatchContent(kidId, '12'), false);
    
    assert.strictEqual(pm.unlockParentalSettings(kidId, '1234'), true); // correct PIN
    assert.strictEqual(pm.canWatchContent(kidId, '18'), true); // unlocked

    assert.throws(() => pm.unlockParentalSettings(kidId, '123'), /PIN must be a 4-digit string/);

    const noPinPm = createProfileManager();
    const npId = noPinPm.addProfile({ name: 'NoPin' });
    assert.throws(() => noPinPm.unlockParentalSettings(npId, '1234'), /No account PIN/);
});

test('Rentals quotes', () => {
    const movies = listRentalMovies();
    assert.strictEqual(Array.isArray(movies), true);
    assert.strictEqual(movies.length, 2);

    const items = [
        { movieId: 'movie-1', quality: 'HD' }, // 14.90
        { movieId: 'movie-1', quality: '4K' }  // 24.90
    ];

    // Standard plan (no discount)
    const quoteStd = quoteRentals({ planId: 'padrao-ads', items });
    assert.strictEqual(quoteStd.subtotal, 39.80);
    assert.strictEqual(quoteStd.discount, 0);
    assert.strictEqual(quoteStd.total, 39.80);

    // ultra-4k plan (20% discount)
    const quote4k = quoteRentals({ planId: 'ultra-4k', items });
    assert.strictEqual(quote4k.subtotal, 39.80);
    assert.strictEqual(quote4k.discount, 7.96); // 20% of 3980 is 796 -> 7.96
    assert.strictEqual(quote4k.total, 31.84); // 39.80 - 7.96

    // Invalid inputs
    assert.throws(() => quoteRentals({ planId: 'padrao-ads', items: [] }), /Items must be a non-empty array/);
    assert.throws(() => quoteRentals({ planId: 'nope', items }), /Plan not found/);
    assert.throws(() => quoteRentals({ planId: 'padrao-ads', items: [{ movieId: 'nope', quality: 'HD' }] }), /Movie not found/);
    assert.throws(() => quoteRentals({ planId: 'padrao-ads', items: [{ movieId: 'movie-2', quality: '4K' }] }), /Quality 4K not available/);
});

test('Billing checkout calculations and failure paths', () => {
    // Basic monthly checkout
    // padrao-ads = 19.90, esportes-live = 24.90
    const m = calculateSubscriptionCheckout({
        planId: 'padrao-ads',
        cycle: 'mensal',
        channelIds: ['esportes-live', 'esportes-live'], // Check deduplication
        rentalsTotalBrl: 10.00
    });
    assert.strictEqual(m.channelIds.length, 1);
    assert.strictEqual(m.baseCyclePrice, 44.80);
    assert.strictEqual(m.recurrentDiscount, 0);
    assert.strictEqual(m.finalRecurrentPrice, 44.80);
    assert.strictEqual(m.rentalsTotalBrl, 10.00);
    assert.strictEqual(m.finalTotal, 54.80);

    // Annual checkout with coupon and rentals
    // full-hd = 39.90, kids-plus = 12.90. Total monthly = 52.80
    // Annual = 12 * 52.80 = 633.60. 16% off = 532.22 (rounded)
    // Coupon DANPLAY20 = 20% off recurrent = 106.44 (rounded)
    const a = calculateSubscriptionCheckout({
        planId: 'full-hd',
        cycle: 'anual',
        channelIds: ['kids-plus'],
        couponCode: 'DANPLAY20',
        rentalsTotalBrl: 5.55
    });
    assert.strictEqual(a.baseCyclePrice, 532.22);
    assert.strictEqual(a.recurrentDiscount, 106.44);
    assert.strictEqual(a.finalRecurrentPrice, 425.78);
    assert.strictEqual(a.rentalsTotalBrl, 5.55);
    assert.strictEqual(a.finalTotal, 431.33);

    // Failure paths
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', cycle: 'semestral' }), /Invalid cycle/);
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', couponCode: 'NOPE' }), /Invalid coupon code/);
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'nope' }), /Invalid plan/);
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', channelIds: ['nope'] }), /Invalid channel/);
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', channelIds: null }), /Invalid channels array/);
    
    // Rentals Total boundary and errors
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: -1 }), /Invalid rentals total/);
    assert.throws(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: 100001 }), /Invalid rentals total/);
    assert.doesNotThrow(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: 0 }));
    assert.doesNotThrow(() => calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: 100000 }));
});
