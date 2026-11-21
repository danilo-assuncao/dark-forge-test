/**
 * Calculates the payment for a solar system.
 * 
 * @param {Object} options
 * @param {number} options.systemCostBrl - The total cost of the system in BRL.
 * @param {string} [options.method='pix'] - The payment method ('pix' or 'price').
 * @param {number} [options.months=48] - The number of months for 'price' financing (24, 48, or 60).
 * @param {string} [options.couponCode=''] - Discount coupon code. Note: Applies a 5% discount to the principal before financing, or before applying a 6% PIX discount.
 * @returns {Object} Payment details.
 */
function calculateSolarPayment({ systemCostBrl, method = 'pix', months = 48, couponCode = '' }) {
    if (typeof systemCostBrl !== 'number' || !Number.isFinite(systemCostBrl) || systemCostBrl < 0) {
        throw new Error('Invalid systemCostBrl');
    }

    let principal = systemCostBrl;
    const normalizedCoupon = (couponCode || '').trim().toUpperCase();

    if (normalizedCoupon === 'DANSOLAR5') {
        principal = principal * 0.95; // 5% discount
    }

    if (method === 'pix') {
        const rawTotal = principal * 0.94; // 6% discount for pix
        const total = Math.round(rawTotal * 100) / 100;
        const roundedPrincipal = Math.round(principal * 100) / 100;
        return {
            method: 'pix',
            principal: roundedPrincipal,
            total,
            discountApplied: Math.round((systemCostBrl - total) * 100) / 100
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
        const monthlyInstallment = Math.round(pmt * 100) / 100;
        const total = Math.round(monthlyInstallment * n * 100) / 100;
        const roundedPrincipal = Math.round(principal * 100) / 100;

        return {
            method: 'price',
            principal: roundedPrincipal,
            months: n,
            monthlyInstallment,
            total,
            interestTotal: Math.round((total - roundedPrincipal) * 100) / 100
        };
    }

    throw new Error('Invalid method. Must be "pix" or "price".');
}

module.exports = { calculateSolarPayment };
