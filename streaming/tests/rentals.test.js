const test = require('node:test');
const assert = require('node:assert/strict');
const { listRentalMovies, quoteRentals, RENTAL_PRICES } = require('../rentals');

test('listRentalMovies should return available rental movies and be immutable', () => {
    const movies = listRentalMovies();
    assert.ok(Array.isArray(movies));
    assert.ok(movies.length > 0);
    assert.ok(movies[0].id);
    assert.ok(Array.isArray(movies[0].availableQualities));
    
    assert.throws(() => {
        'use strict';
        movies.push({});
    }, TypeError);
});

test('quoteRentals should calculate total without discount for regular plans', () => {
    const quote = quoteRentals({
        planId: 'full-hd',
        items: [
            { movieId: 'movie-1', quality: '4K' },
            { movieId: 'movie-2', quality: 'HD' }
        ]
    });
    
    const expectedSubtotal = RENTAL_PRICES['4K'] + RENTAL_PRICES['HD'];
    assert.strictEqual(quote.subtotal, expectedSubtotal);
    assert.strictEqual(quote.discount, 0);
    assert.strictEqual(quote.total, expectedSubtotal);
    assert.strictEqual(quote.validityHours, 48);
});

test('quoteRentals should apply 20% discount for ultra-4k plan', () => {
    const quote = quoteRentals({
        planId: 'ultra-4k',
        items: [
            { movieId: 'movie-1', quality: '4K' },
            { movieId: 'movie-2', quality: 'HD' }
        ]
    });
    
    const expectedSubtotalCents = Math.round((RENTAL_PRICES['4K'] + RENTAL_PRICES['HD']) * 100);
    const expectedDiscountCents = Math.round(expectedSubtotalCents * 0.20);
    const expectedTotalCents = expectedSubtotalCents - expectedDiscountCents;
    
    assert.strictEqual(quote.subtotal, expectedSubtotalCents / 100);
    assert.strictEqual(quote.discount, expectedDiscountCents / 100);
    assert.strictEqual(quote.total, expectedTotalCents / 100);
    assert.strictEqual(quote.validityHours, 48);
});

test('quoteRentals should calculate discount correctly for a single item (boundary rounding test)', () => {
    const quote = quoteRentals({
        planId: 'ultra-4k',
        items: [
            { movieId: 'movie-2', quality: 'HD' }
        ]
    });
    
    const expectedSubtotalCents = Math.round(RENTAL_PRICES['HD'] * 100); // 1490
    const expectedDiscountCents = Math.round(expectedSubtotalCents * 0.20); // 298
    const expectedTotalCents = expectedSubtotalCents - expectedDiscountCents; // 1192
    
    assert.strictEqual(quote.subtotal, 14.90);
    assert.strictEqual(quote.discount, 2.98);
    assert.strictEqual(quote.total, 11.92);
});

test('quoteRentals should throw error for invalid movie', () => {
    assert.throws(
        () => quoteRentals({ planId: 'full-hd', items: [{ movieId: 'non-existent', quality: 'HD' }] }),
        /Movie not found/
    );
});

test('quoteRentals should throw error for unavailable quality', () => {
    assert.throws(
        () => quoteRentals({ planId: 'full-hd', items: [{ movieId: 'movie-2', quality: '4K' }] }),
        /Quality 4K not available/
    );
});

test('quoteRentals should throw error for unknown plan', () => {
    assert.throws(
        () => quoteRentals({ planId: 'bogus', items: [{ movieId: 'movie-1', quality: 'HD' }] }),
        /Plan not found: bogus/
    );
});

test('quoteRentals should throw error for empty or invalid items', () => {
    assert.throws(
        () => quoteRentals({ planId: 'full-hd', items: [] }),
        /Items must be a non-empty array/
    );
    assert.throws(
        () => quoteRentals({ planId: 'full-hd' }),
        /Items must be a non-empty array/
    );
    assert.throws(
        () => quoteRentals({ planId: 'full-hd', items: [null] }),
        /Invalid item/
    );
});

test('quoteRentals should throw error for undefined quality', () => {
    assert.throws(
        () => quoteRentals({ planId: 'full-hd', items: [{ movieId: 'movie-1' }] }),
        /Quality undefined not available/
    );
});
