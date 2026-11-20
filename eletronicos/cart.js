const STORAGE_KEY = 'dan-tech-cart';
const PIX_DISCOUNT_RATE = 0.10;
const MAX_INSTALLMENTS = 12;
const MAX_QTY = 99;

// Coupon discounts are percentages of the subtotal. Codes are case-insensitive.
const COUPONS = new Map([
    ['DANTECH10', { percent: 10 }]
]);

function defaultStorage() {
    try {
        return (typeof globalThis !== 'undefined' && globalThis.localStorage) || null;
    } catch (e) {
        return null;
    }
}

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim() !== '';
}

function isValidItem(it) {
    return it && isNonEmptyString(it.id) &&
        Number.isInteger(it.priceCents) && it.priceCents >= 0 &&
        Number.isInteger(it.qty) && it.qty >= 1 && it.qty <= MAX_QTY;
}

class Cart {
    /**
     * @param {Storage} [storage] - localStorage-like object; defaults to globalThis.localStorage.
     *   Without any storage the cart still works in memory.
     */
    constructor(storage) {
        this.storage = storage === undefined ? defaultStorage() : storage;
        this.items = [];
        this.couponCode = null;
        this._load();
    }

    _load() {
        if (!this.storage) return;
        try {
            const raw = this.storage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && Array.isArray(data.items)) {
                this.items = data.items.filter(isValidItem).map((i) => ({
                    id: i.id, name: typeof i.name === 'string' ? i.name : i.id,
                    priceCents: i.priceCents, qty: i.qty
                }));
            }
            if (data && typeof data.coupon === 'string' && COUPONS.has(data.coupon)) {
                this.couponCode = data.coupon;
            }
        } catch (e) {
            this.items = [];
            this.couponCode = null;
        }
    }

    _save() {
        if (!this.storage) return;
        try {
            this.storage.setItem(STORAGE_KEY, JSON.stringify({ items: this.items, coupon: this.couponCode }));
        } catch (e) {
            // Storage full or unavailable: keep working in memory.
        }
    }

    addItem(id, name, priceCents, qty = 1) {
        const item = { id, name, priceCents, qty };
        if (!isValidItem(item)) {
            throw new Error('Invalid cart item. id, integer priceCents >= 0 and qty 1-99 are required.');
        }
        const existing = this.items.find((i) => i.id === id);
        if (existing) {
            if (existing.priceCents !== priceCents) {
                throw new Error(`Price mismatch for item '${id}'.`);
            }
            if (existing.qty + qty > MAX_QTY) {
                throw new Error('Invalid cart item. id, integer priceCents >= 0 and qty 1-99 are required.');
            }
            existing.qty += qty;
        } else {
            this.items.push({ id, name: typeof name === 'string' ? name : id, priceCents, qty });
        }
        this._save();
    }

    removeItem(id) {
        this.items = this.items.filter((i) => i.id !== id);
        this._save();
    }

    clear() {
        this.items = [];
        this.couponCode = null;
        this._save();
    }

    applyCoupon(code) {
        const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
        if (!COUPONS.has(normalized)) {
            throw new Error('Invalid coupon');
        }
        this.couponCode = normalized;
        this._save();
    }

    removeCoupon() {
        this.couponCode = null;
        this._save();
    }

    subtotalCents() {
        return this.items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
    }

    /**
     * Totals in cents. The coupon applies to the subtotal first; the PIX discount
     * (10%) then applies to the coupon-discounted amount. Card totals have no
     * interest, so they equal the coupon-discounted amount.
     */
    totals() {
        const subtotalCents = this.subtotalCents();
        const coupon = this.couponCode ? COUPONS.get(this.couponCode) : null;
        const couponDiscountCents = coupon ? Math.floor(subtotalCents * coupon.percent / 100) : 0;
        const totalCents = subtotalCents - couponDiscountCents;
        const pixDiscountCents = Math.floor(totalCents * PIX_DISCOUNT_RATE);
        return {
            subtotalCents,
            couponCode: this.couponCode,
            couponDiscountCents,
            totalCents,
            pixDiscountCents,
            pixTotalCents: totalCents - pixDiscountCents
        };
    }

    /**
     * Interest-free installments of the card total (up to 12x). Remainder cents go
     * to the first installments so the parts always sum to the total.
     */
    installments(count) {
        if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
            throw new Error('Invalid installments. Allowed: 1 to 12.');
        }
        const { totalCents } = this.totals();
        const base = Math.floor(totalCents / count);
        const remainder = totalCents - base * count;
        const amounts = Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
        return { count, totalCents, amounts };
    }
}

module.exports = {
    Cart,
    STORAGE_KEY,
    PIX_DISCOUNT_RATE,
    MAX_INSTALLMENTS
};
