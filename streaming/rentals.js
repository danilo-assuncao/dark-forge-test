const { getPlanById } = require('./plans');

const VALIDITY_HOURS = 48;

const RENTAL_PRICES = {
    'HD': 14.90,
    '4K': 24.90
};

const RENTAL_MOVIES = [
    {
        id: 'movie-1',
        title: 'Lançamento 1',
        availableQualities: ['HD', '4K']
    },
    {
        id: 'movie-2',
        title: 'Lançamento 2',
        availableQualities: ['HD']
    }
].map(m => Object.freeze({ ...m, availableQualities: Object.freeze([...m.availableQualities]) }));

Object.freeze(RENTAL_MOVIES);
Object.freeze(RENTAL_PRICES);

function listRentalMovies() {
    return RENTAL_MOVIES;
}

/**
 * @param {Object} params
 * @param {string} params.planId
 * @param {Array<{movieId: string, quality: string}>} params.items
 */
function quoteRentals({ planId, items }) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items must be a non-empty array');
    }

    const plan = getPlanById(planId);
    if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
    }

    let subtotalCents = 0;

    for (const item of items) {
        if (!item || typeof item !== 'object') {
            throw new Error('Invalid item');
        }
        const movie = RENTAL_MOVIES.find(m => m.id === item.movieId);
        if (!movie) {
            throw new Error(`Movie not found: ${item.movieId}`);
        }
        if (!movie.availableQualities.includes(item.quality)) {
            throw new Error(`Quality ${item.quality} not available for movie ${item.movieId}`);
        }
        
        subtotalCents += Math.round(RENTAL_PRICES[item.quality] * 100);
    }

    let discountCents = 0;
    if (plan.id === 'ultra-4k') {
        discountCents = Math.round(subtotalCents * 0.20);
    }

    const totalCents = subtotalCents - discountCents;

    return {
        subtotal: subtotalCents / 100,
        discount: discountCents / 100,
        total: totalCents / 100,
        validityHours: VALIDITY_HOURS
    };
}

module.exports = {
    listRentalMovies,
    quoteRentals,
    RENTAL_PRICES
};
