const vehiclePrices = Object.create(null);
vehiclePrices['A'] = 80;
vehiclePrices['B'] = 100;
vehiclePrices['C'] = 150;
vehiclePrices['D'] = 200;

function generateVoucherCode() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `CAR-${randomNum}`;
}

function calculateTotal(vehicleGroup, days, kmModality, extrasDaily, coupon) {
    let dailyRate = vehiclePrices[vehicleGroup] || 0;
    
    if (kmModality === 'unlimited') {
        dailyRate += 30;
    }

    let total = (dailyRate + extrasDaily) * days;

    const normalizedCoupon = typeof coupon === 'string' ? coupon.trim().toUpperCase() : '';
    if (normalizedCoupon === 'DANCAR10') {
        total = Math.round(total * 90) / 100;
    }

    return total;
}

function validateDriver(age, cnh) {
    if (!Number.isInteger(age) || age < 18) {
        return { valid: false, message: 'Idade mínima para aluguel é 18 anos.' };
    }
    if (typeof cnh !== 'string' || !/^\d{11}$/.test(cnh)) {
        return { valid: false, message: 'CNH inválida. Deve conter 11 dígitos numéricos.' };
    }
    return { valid: true };
}

function processRental(data) {
    const { vehicleGroup, days, kmModality, extrasDaily, age, cnh, coupon } = data;

    if (
        !vehicleGroup || 
        !Object.prototype.hasOwnProperty.call(vehiclePrices, vehicleGroup) ||
        !Number.isInteger(days) || 
        days < 1 ||
        days > 365 ||
        (kmModality !== 'limited' && kmModality !== 'unlimited')
    ) {
        return { success: false, message: 'Por favor, preencha todos os campos obrigatórios corretamente.' };
    }

    if (!Number.isFinite(extrasDaily) || extrasDaily < 0) {
        return { success: false, message: 'Adicionais inválidos.' };
    }

    const driverValidation = validateDriver(age, cnh);
    if (!driverValidation.valid) {
        return { success: false, message: driverValidation.message };
    }

    const total = calculateTotal(vehicleGroup, days, kmModality, extrasDaily, coupon);
    
    if (!Number.isFinite(total) || total <= 0) {
        return { success: false, message: 'Total inválido.' };
    }

    const voucherCode = generateVoucherCode();

    const voucherText = `Voucher: ${voucherCode}
Grupo de Veículo: ${vehicleGroup}
Dias: ${days}
Modalidade: ${kmModality === 'unlimited' ? 'KM Livre' : 'KM Controlado'}
Total a pagar: R$ ${total.toFixed(2)}`;

    return { success: true, voucherCode, voucherText, total };
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('rental-form');
        const voucherSection = document.getElementById('voucher-section');
        const voucherDetails = document.getElementById('voucher-details');
        const errorMessage = document.getElementById('error-message');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            voucherDetails.textContent = '';
            errorMessage.textContent = '';
            errorMessage.classList.add('hidden');
            voucherSection.classList.add('hidden');

            const vehicleGroup = document.getElementById('vehicle-group').value;
            const days = parseInt(document.getElementById('days').value, 10);
            const kmModality = document.getElementById('km-modality').value;
            const age = parseInt(document.getElementById('age').value, 10);
            const cnh = document.getElementById('cnh').value;
            const coupon = document.getElementById('coupon').value;

            const extraPrices = {
                'protection-basic': 20,
                'protection-premium': 50,
                'accessory-gps': 10,
                'accessory-babyseat': 15
            };

            let extrasDaily = 0;
            const checkboxes = ['protection-basic', 'protection-premium', 'accessory-gps', 'accessory-babyseat'];
            checkboxes.forEach(id => {
                const cb = document.getElementById(id);
                if (cb && cb.checked) {
                    extrasDaily += extraPrices[id];
                }
            });

            const result = processRental({
                vehicleGroup,
                days,
                kmModality,
                extrasDaily,
                age,
                cnh,
                coupon
            });

            voucherSection.classList.remove('hidden');

            if (result.success) {
                voucherDetails.textContent = result.voucherText;
                voucherDetails.classList.remove('hidden');
                errorMessage.classList.add('hidden');
            } else {
                errorMessage.textContent = result.message;
                errorMessage.classList.remove('hidden');
                voucherDetails.classList.add('hidden');
            }
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        vehiclePrices,
        generateVoucherCode,
        calculateTotal,
        validateDriver,
        processRental
    };
}