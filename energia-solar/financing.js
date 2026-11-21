/**
 * Calculates the payment for a solar system.
 * 
 * @param {Object} options
 * @param {number} options.systemCostBrl - The total cost of the system in BRL.
 * @param {string} [options.method='pix'] - The payment method ('pix' or 'price').
 * @param {number} [options.months=48] - The number of months for 'price' financing (24, 48, or 60).
 * @param {string} [options.couponCode=''] - Discount coupon code.
 * @returns {Object} Payment details.
 */
function calculateSolarPayment({ systemCostBrl, method = 'pix', months = 48, couponCode = '' }) {
    if (typeof systemCostBrl !== 'number' || systemCostBrl < 0) {
        throw new Error('Invalid systemCostBrl');
    }

    let principal = systemCostBrl;

    if (couponCode === 'DANSOLAR5') {
        principal = principal * 0.95; // 5% discount
    }

    if (method === 'pix') {
        const total = principal * 0.94; // 6% discount for pix
        return {
            method: 'pix',
            principal,
            total,
            discountApplied: systemCostBrl - total
        };
    }

    if (method === 'price') {
        const validMonths = [24, 48, 60];
        if (!validMonths.includes(months)) {
            throw new Error('Invalid months for price financing. Must be 24, 48, or 60.');
        }

        const r = 0.0129;
        const n = months;
        const pmt = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const total = pmt * n;

        return {
            method: 'price',
            principal,
            months: n,
            monthlyInstallment: pmt,
            total,
            interestTotal: total - principal
        };
    }

    throw new Error('Invalid method. Must be "pix" or "price".');
}

module.exports = { calculateSolarPayment };
