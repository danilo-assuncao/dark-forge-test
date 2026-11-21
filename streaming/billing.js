const crypto = require('crypto');
const { getPlanById, listExtraChannels } = require('./plans');

function generateProtocol() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return `PLY-${code}`;
}

function calculateSubscriptionCheckout({ planId, channelIds = [], cycle = 'mensal', rentalsTotalBrl = 0, couponCode = '' }) {
    if (cycle !== 'mensal' && cycle !== 'anual') {
        throw new Error('Invalid cycle');
    }

    if (typeof rentalsTotalBrl !== 'number' || !Number.isFinite(rentalsTotalBrl) || rentalsTotalBrl < 0 || rentalsTotalBrl > 100000) {
        throw new Error('Invalid rentals total');
    }

    if (!Array.isArray(channelIds)) {
        throw new Error('Invalid channels array');
    }

    const plan = getPlanById(planId);
    if (!plan) {
        throw new Error('Invalid plan');
    }

    const uniqueChannelIds = [...new Set(channelIds)];
    const availableChannels = listExtraChannels();
    
    let planMonthlyCents = Math.round(plan.price * 100);
    let channelsMonthlyCents = 0;

    for (const channelId of uniqueChannelIds) {
        const channel = availableChannels.find(c => c.id === channelId);
        if (!channel) {
            throw new Error('Invalid channel');
        }
        channelsMonthlyCents += Math.round(channel.price * 100);
    }

    let baseCyclePriceCents = 0;
    if (cycle === 'anual') {
        const rawAnnualCents = 12 * (planMonthlyCents + channelsMonthlyCents);
        baseCyclePriceCents = Math.round(rawAnnualCents * 0.84);
    } else {
        baseCyclePriceCents = planMonthlyCents + channelsMonthlyCents;
    }

    let recurrentDiscountCents = 0;
    if (couponCode) {
        if (couponCode === 'DANPLAY20') {
            recurrentDiscountCents = Math.round(baseCyclePriceCents * 0.20);
        } else {
            throw new Error('Invalid coupon code');
        }
    }

    const finalRecurrentPriceCents = baseCyclePriceCents - recurrentDiscountCents;
    const rentalsCents = Math.round(rentalsTotalBrl * 100);
    const finalTotalCents = finalRecurrentPriceCents + rentalsCents;

    if (finalTotalCents < 0) {
        throw new Error('Total cannot be negative');
    }

    return {
        protocol: generateProtocol(),
        baseCyclePrice: baseCyclePriceCents / 100,
        recurrentDiscount: recurrentDiscountCents / 100,
        finalRecurrentPrice: finalRecurrentPriceCents / 100,
        rentalsTotalBrl: rentalsCents / 100,
        finalTotal: finalTotalCents / 100,
        cycle,
        planId,
        channelIds: uniqueChannelIds,
        couponCode
    };
}

module.exports = {
    calculateSubscriptionCheckout,
    generateProtocol
};
