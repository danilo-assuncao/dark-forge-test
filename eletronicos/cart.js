const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

class Cart {
    constructor() {
        this.items = [];
        this.coupon = null;
    }

    addItem(component, price, quantity = 1) {
        if (!component || typeof component.id !== 'string') {
            throw new Error('Invalid component.');
        }
        if (typeof price !== 'number' || price < 0) {
            throw new Error('Invalid price.');
        }
        if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
            throw new Error('Invalid quantity.');
        }

        const existingItem = this.items.find(item => item.component.id === component.id);
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.price = price;
        } else {
            this.items.push({ component, price, quantity });
        }
    }

    removeItem(componentId) {
        this.items = this.items.filter(item => item.component.id !== componentId);
    }

    applyCoupon(code) {
        if (code === 'DANTECH10') {
            this.coupon = code;
            return true;
        }
        this.coupon = null;
        return false;
    }

    getSubtotal() {
        return round2(this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0));
    }

    checkout(paymentMethod = 'credit_card', installments = 1) {
        if (this.items.length === 0) {
            throw new Error('Cart is empty.');
        }
        if (installments < 1 || !Number.isInteger(installments)) {
            throw new Error('Invalid installments.');
        }
        if (paymentMethod === 'pix' && installments > 1) {
            throw new Error('PIX must be paid in a single installment.');
        }

        let subtotal = this.getSubtotal();
        let total = subtotal;
        
        let couponDiscount = 0;
        if (this.coupon === 'DANTECH10') {
            couponDiscount = round2(subtotal * 0.10);
            total = round2(total - couponDiscount);
        }

        let paymentDiscount = 0;
        if (paymentMethod === 'pix') {
            paymentDiscount = round2(total * 0.10);
            total = round2(total - paymentDiscount);
        }

        return {
            subtotal,
            couponDiscount,
            paymentDiscount,
            total,
            paymentMethod,
            installments,
            installmentValue: round2(total / installments)
        };
    }
}

module.exports = { Cart };
