const { getPlanById, listExtraChannels } = require('./plans');

function generateProtocol() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PLY-${code}`;
}

function calculateSubscriptionCheckout({ planId, channelIds = [], cycle = 'mensal', rentalsTotalBrl = 0, couponCode = '' }) {
    const plan = getPlanById(planId);
    if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
    }

    let planMonthly = plan.price;
    let channelsMonthly = 0;
    
    const availableChannels = listExtraChannels();
    for (const channelId of channelIds) {
        const channel = availableChannels.find(c => c.id === channelId);
        if (!channel) {
            throw new Error(`Channel not found: ${channelId}`);
        }
        channelsMonthly += channel.price;
    }

    let baseCyclePrice = 0;
    if (cycle === 'anual') {
        const rawAnnual = 12 * (planMonthly + channelsMonthly);
        // Apply 16% discount
        baseCyclePrice = rawAnnual * 0.84;
    } else {
        baseCyclePrice = planMonthly + channelsMonthly;
    }

    let recurrentDiscount = 0;
    if (couponCode === 'DANPLAY20') {
        recurrentDiscount = baseCyclePrice * 0.20;
    }

    const finalRecurrentPrice = baseCyclePrice - recurrentDiscount;
    const finalTotal = finalRecurrentPrice + rentalsTotalBrl;

    return {
        protocol: generateProtocol(),
        baseCyclePrice: Number(baseCyclePrice.toFixed(2)),
        recurrentDiscount: Number(recurrentDiscount.toFixed(2)),
        finalRecurrentPrice: Number(finalRecurrentPrice.toFixed(2)),
        rentalsTotalBrl: Number(rentalsTotalBrl),
        finalTotal: Number(finalTotal.toFixed(2)),
        cycle,
        planId,
        channelIds,
        couponCode
    };
}

module.exports = {
    calculateSubscriptionCheckout
};
