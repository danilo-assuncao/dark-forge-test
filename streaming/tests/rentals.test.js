const test = require('node:test');
const assert = require('node:assert/strict');
const { listRentalMovies, quoteRentals, RENTAL_PRICES } = require('../rentals');

test('listRentalMovies should return available rental movies', () => {
    const movies = listRentalMovies();
    assert.ok(Array.isArray(movies));
    assert.ok(movies.length > 0);
    assert.ok(movies[0].id);
    assert.ok(Array.isArray(movies[0].availableQualities));
});

test('quoteRentals should calculate total without discount for regular plans', () => {
    const quote = quoteRentals({
        planId: 'full-hd',
        items: [
            { movieId: 'movie-1', quality: '4K' },
            { movieId: 'movie-2', quality: 'HD' }
        ]
    });
    
    assert.strictEqual(quote.subtotal, 39.80);
    assert.strictEqual(quote.discount, 0);
    assert.strictEqual(quote.total, 39.80);
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
    
    assert.strictEqual(quote.subtotal, 39.80);
    assert.strictEqual(quote.discount, 7.96); // 39.80 * 0.20
    assert.strictEqual(quote.total, 31.84);
    assert.strictEqual(quote.validityHours, 48);
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
