const plans = [
    {
        id: 'padrao-ads',
        price: 19.90,
        screens: 2,
        resolution: '1080p'
    },
    {
        id: 'full-hd',
        price: 39.90,
        screens: 2,
        resolution: '1080p',
        offlineDownloads: true
    },
    {
        id: 'ultra-4k',
        price: 55.90,
        screens: 4,
        resolution: '4K HDR',
        dolbyAtmos: true
    }
];

const extraChannels = [
    {
        id: 'esportes-live',
        price: 24.90
    },
    {
        id: 'premiere-cinema',
        price: 19.90
    },
    {
        id: 'kids-plus',
        price: 12.90
    }
];

function listPlans() {
    return plans;
}

function listExtraChannels() {
    return extraChannels;
}

function getPlanById(planId) {
    return plans.find(plan => plan.id === planId);
}

module.exports = {
    listPlans,
    listExtraChannels,
    getPlanById
};
