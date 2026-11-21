// --- Logic from plans.js ---
const plans = [
    { id: 'padrao-ads', price: 19.90, screens: 2, resolution: '1080p' },
    { id: 'full-hd', price: 39.90, screens: 2, resolution: '1080p', offlineDownloads: true },
    { id: 'ultra-4k', price: 55.90, screens: 4, resolution: '4K HDR', dolbyAtmos: true }
].map(p => Object.freeze(p));
Object.freeze(plans);

const extraChannels = [
    { id: 'esportes-live', price: 24.90 },
    { id: 'premiere-cinema', price: 19.90 },
    { id: 'kids-plus', price: 12.90 }
].map(c => Object.freeze(c));
Object.freeze(extraChannels);

function listPlans() { return plans; }
function listExtraChannels() { return extraChannels; }
function getPlanById(planId) { return plans.find(plan => plan.id === planId); }

// --- Logic from profiles.js ---
const VALID_RATINGS = ['L', '10', '12', '14', '16', '18'];
const RATINGS_ORDER = { 'L': 0, '10': 1, '12': 2, '14': 3, '16': 4, '18': 5 };

function createProfileManager(accountPin) {
    if (accountPin !== undefined && (typeof accountPin !== 'string' || !/^\d{4}$/.test(accountPin))) {
        throw new Error('Invalid account PIN: must be a 4-digit numeric string');
    }

    const profiles = new Map();
    let nextId = 1;

    function addProfile(options) {
        if (!options || typeof options !== 'object') throw new Error('Options must be an object');
        let { name, isKids = false, maxRating = '18' } = options;

        if (typeof name !== 'string' || name.trim() === '') throw new Error('Name must be a non-empty string');
        if (typeof isKids !== 'boolean') throw new Error('isKids must be a boolean');
        if (profiles.size >= 5) throw new Error('Maximum of 5 profiles reached');
        if (!VALID_RATINGS.includes(maxRating)) throw new Error('Invalid rating');

        if (isKids && RATINGS_ORDER[maxRating] > RATINGS_ORDER['10']) {
            maxRating = '10';
        }

        const id = (nextId++).toString();
        const profile = { id, name, isKids, maxRating, parentalUnlocked: false };
        profiles.set(id, profile);
        return id;
    }

    function canWatchContent(profileId, contentRating) {
        const profile = profiles.get(profileId);
        if (!profile) throw new Error('Profile not found');
        if (!VALID_RATINGS.includes(contentRating)) throw new Error('Invalid content rating');
        const effectiveMaxRating = profile.parentalUnlocked ? '18' : profile.maxRating;
        return RATINGS_ORDER[contentRating] <= RATINGS_ORDER[effectiveMaxRating];
    }

    function unlockParentalSettings(profileId, pin) {
        if (accountPin === undefined) throw new Error('No account PIN configured');
        const profile = profiles.get(profileId);
        if (!profile) throw new Error('Profile not found');
        if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) throw new Error('PIN must be a 4-digit string');
        if (pin !== accountPin) return false;
        profile.parentalUnlocked = true;
        return true;
    }
    
    function listProfiles() {
        return Array.from(profiles.values());
    }

    return { addProfile, canWatchContent, unlockParentalSettings, listProfiles };
}

// --- Logic from rentals.js ---
const VALIDITY_HOURS = 48;
const RENTAL_PRICES = { 'HD': 14.90, '4K': 24.90 };
const RENTAL_MOVIES = [
    { id: 'movie-1', title: 'Lançamento 1', availableQualities: ['HD', '4K'] },
    { id: 'movie-2', title: 'Lançamento 2', availableQualities: ['HD'] }
].map(m => Object.freeze({ ...m, availableQualities: Object.freeze([...m.availableQualities]) }));

Object.freeze(RENTAL_MOVIES);
Object.freeze(RENTAL_PRICES);

function listRentalMovies() { return RENTAL_MOVIES; }

function quoteRentals({ planId, items }) {
    if (!Array.isArray(items) || items.length === 0) throw new Error('Items must be a non-empty array');
    const plan = getPlanById(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    let subtotalCents = 0;
    for (const item of items) {
        if (!item || typeof item !== 'object') throw new Error('Invalid item');
        const movie = RENTAL_MOVIES.find(m => m.id === item.movieId);
        if (!movie) throw new Error(`Movie not found: ${item.movieId}`);
        if (!movie.availableQualities.includes(item.quality)) {
            throw new Error(`Quality ${item.quality} not available for movie ${item.movieId}`);
        }
        subtotalCents += Math.round(RENTAL_PRICES[item.quality] * 100);
    }

    let discountCents = 0;
    if (plan.id === 'ultra-4k') discountCents = Math.round(subtotalCents * 0.20);
    const totalCents = subtotalCents - discountCents;

    return {
        subtotal: subtotalCents / 100,
        discount: discountCents / 100,
        total: totalCents / 100,
        validityHours: VALIDITY_HOURS
    };
}

// --- Logic from billing.js ---
function generateProtocol() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        let rand;
        // Node testing fallback
        if (typeof process !== 'undefined' && process.release && process.release.name === 'node') {
            try {
                // Using dynamic require cautiously to avoid browser errors
                const crypto = new Function('return require("crypto")')();
                rand = crypto.randomInt(0, chars.length);
            } catch (e) {
                rand = Math.floor(Math.random() * chars.length);
            }
        } else {
            rand = Math.floor(Math.random() * chars.length);
        }
        code += chars.charAt(rand);
    }
    return `PLY-${code}`;
}

function calculateSubscriptionCheckout({ planId, channelIds = [], cycle = 'mensal', rentalsTotalBrl = 0, couponCode = '' }) {
    if (cycle !== 'mensal' && cycle !== 'anual') throw new Error('Invalid cycle');
    if (typeof rentalsTotalBrl !== 'number' || !Number.isFinite(rentalsTotalBrl) || rentalsTotalBrl < 0 || rentalsTotalBrl > 100000) {
        throw new Error('Invalid rentals total');
    }
    if (!Array.isArray(channelIds)) throw new Error('Invalid channels array');

    const plan = getPlanById(planId);
    if (!plan) throw new Error('Invalid plan');

    const uniqueChannelIds = [...new Set(channelIds)];
    const availableChannels = listExtraChannels();
    
    let planMonthlyCents = Math.round(plan.price * 100);
    let channelsMonthlyCents = 0;

    for (const channelId of uniqueChannelIds) {
        const channel = availableChannels.find(c => c.id === channelId);
        if (!channel) throw new Error('Invalid channel');
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

    if (finalTotalCents < 0) throw new Error('Total cannot be negative');

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

// --- DOM Interaction ---
if (typeof window !== 'undefined' && window.document) {
    document.addEventListener('DOMContentLoaded', () => {
        let selectedPlanId = 'padrao-ads';
        let selectedChannels = new Set();
        let selectedRentals = []; // array of { movieId, quality }
        let profileManager = null;

        // Render Plans
        const plansContainer = document.getElementById('plans-container');
        listPlans().forEach(plan => {
            const el = document.createElement('div');
            el.className = `card ${plan.id === selectedPlanId ? 'selected' : ''}`;
            el.dataset.id = plan.id;
            
            const h4 = document.createElement('h4');
            h4.textContent = plan.id.toUpperCase();
            
            const pPrice = document.createElement('p');
            pPrice.textContent = `R$ ${plan.price.toFixed(2)}/mês`;
            
            const pScreens = document.createElement('p');
            pScreens.textContent = `Telas: ${plan.screens}`;
            
            const pRes = document.createElement('p');
            pRes.textContent = `Resolução: ${plan.resolution}`;
            
            el.appendChild(h4);
            el.appendChild(pPrice);
            el.appendChild(pScreens);
            el.appendChild(pRes);
            
            el.addEventListener('click', () => {
                selectedPlanId = plan.id;
                document.querySelectorAll('#plans-container .card').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
            });
            plansContainer.appendChild(el);
        });

        // Render Channels
        const channelsContainer = document.getElementById('channels-container');
        listExtraChannels().forEach(channel => {
            const el = document.createElement('div');
            el.className = 'card';
            el.dataset.id = channel.id;
            
            const h4 = document.createElement('h4');
            h4.textContent = channel.id.toUpperCase();
            
            const pPrice = document.createElement('p');
            pPrice.textContent = `+ R$ ${channel.price.toFixed(2)}/mês`;
            
            el.appendChild(h4);
            el.appendChild(pPrice);
            
            el.addEventListener('click', () => {
                if (selectedChannels.has(channel.id)) {
                    selectedChannels.delete(channel.id);
                    el.classList.remove('selected');
                } else {
                    selectedChannels.add(channel.id);
                    el.classList.add('selected');
                }
            });
            channelsContainer.appendChild(el);
        });

        // Render Rentals
        const rentalsContainer = document.getElementById('rentals-container');
        listRentalMovies().forEach(movie => {
            const el = document.createElement('div');
            el.className = 'card';
            
            const h4 = document.createElement('h4');
            h4.textContent = movie.title;
            
            const sel = document.createElement('select');
            sel.className = 'rental-quality';
            
            movie.availableQualities.forEach(q => {
                const opt = document.createElement('option');
                opt.value = q;
                opt.textContent = `${q} - R$ ${RENTAL_PRICES[q].toFixed(2)}`;
                sel.appendChild(opt);
            });
            
            const btn = document.createElement('button');
            btn.className = 'add-rental-btn';
            btn.textContent = 'Alugar 48h';
            
            el.appendChild(h4);
            el.appendChild(sel);
            el.appendChild(btn);
            
            btn.addEventListener('click', () => {
                const quality = sel.value;
                selectedRentals.push({ movieId: movie.id, quality });
                alert(`Aluguel adicionado: ${movie.title} em ${quality}`);
            });
            
            rentalsContainer.appendChild(el);
        });

        // Setup Profiles
        document.getElementById('set-pin-btn').addEventListener('click', () => {
            const pin = document.getElementById('account-pin').value;
            try {
                profileManager = createProfileManager(pin);
                document.getElementById('profile-manager-ui').style.display = 'block';
                alert('PIN definido com sucesso!');
            } catch (e) {
                alert(e.message);
            }
        });

        document.getElementById('add-profile-btn').addEventListener('click', () => {
            if (!profileManager) return;
            const name = document.getElementById('profile-name').value;
            const isKids = document.getElementById('profile-kids').checked;
            const maxRating = document.getElementById('profile-rating').value;
            
            try {
                profileManager.addProfile({ name, isKids, maxRating });
                renderProfiles();
            } catch(e) {
                alert(e.message);
            }
        });

        function renderProfiles() {
            const list = document.getElementById('profiles-list');
            list.textContent = '';
            profileManager.listProfiles().forEach(p => {
                const li = document.createElement('li');
                li.textContent = `${p.name} - Rating Max: ${p.maxRating} ${p.isKids ? '(Kids)' : ''}`;
                list.appendChild(li);
            });
        }

        // Checkout
        document.getElementById('calculate-btn').addEventListener('click', () => {
            const cycle = document.querySelector('input[name="cycle"]:checked').value;
            const couponCode = document.getElementById('coupon-code').value.trim();
            
            try {
                let rentalsTotalBrl = 0;
                if (selectedRentals.length > 0) {
                    const quote = quoteRentals({ planId: selectedPlanId, items: selectedRentals });
                    rentalsTotalBrl = quote.total;
                }

                const checkout = calculateSubscriptionCheckout({
                    planId: selectedPlanId,
                    channelIds: Array.from(selectedChannels),
                    cycle,
                    rentalsTotalBrl,
                    couponCode
                });

                document.getElementById('checkout-summary').style.display = 'block';
                document.getElementById('summary-plan').textContent = selectedPlanId;
                document.getElementById('summary-cycle').textContent = cycle;
                document.getElementById('summary-channels').textContent = Array.from(selectedChannels).join(', ') || 'Nenhum';
                document.getElementById('summary-rentals').textContent = checkout.rentalsTotalBrl.toFixed(2);
                document.getElementById('summary-discount').textContent = checkout.recurrentDiscount.toFixed(2);
                document.getElementById('summary-total').textContent = checkout.finalTotal.toFixed(2);
                document.getElementById('summary-protocol').textContent = checkout.protocol;
                
            } catch(e) {
                alert(e.message);
            }
        });
    });
}

// Module exports for node tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        listPlans,
        getPlanById,
        listExtraChannels,
        createProfileManager,
        listRentalMovies,
        quoteRentals,
        RENTAL_PRICES,
        generateProtocol,
        calculateSubscriptionCheckout
    };
}
