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
function quoteRentals({ planId, items = [] }) {
    let subtotal = 0;

    for (const item of items) {
        const movie = RENTAL_MOVIES.find(m => m.id === item.movieId);
        if (!movie) {
            throw new Error(`Movie not found: ${item.movieId}`);
        }
        if (!movie.availableQualities.includes(item.quality)) {
            throw new Error(`Quality ${item.quality} not available for movie ${item.movieId}`);
        }
        if (typeof RENTAL_PRICES[item.quality] === 'undefined') {
             throw new Error(`Invalid quality: ${item.quality}`);
        }
        subtotal += RENTAL_PRICES[item.quality];
    }

    const plan = getPlanById(planId);
    let discount = 0;

    if (plan && plan.id === 'ultra-4k') {
        discount = subtotal * 0.20;
    }

    const total = subtotal - discount;

    return {
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        total: Number(total.toFixed(2)),
        validityHours: VALIDITY_HOURS
    };
}

module.exports = {
    listRentalMovies,
    quoteRentals,
    RENTAL_PRICES
};
