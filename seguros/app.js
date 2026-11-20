const DanSeguros = {
    calculateInsurance({ fipe, age, usage, franchise, coverages, coupon }) {
        let basePremium = fipe * 0.05;
        
        if (age < 25) basePremium *= 1.2;
        else if (age > 60) basePremium *= 1.1;

        if (usage === 'comercial') basePremium *= 1.15;
        else if (usage === 'app') basePremium *= 1.3;

        if (franchise === 'reduzida') basePremium *= 1.2;
        else if (franchise === 'majorada') basePremium *= 0.8;

        let additionalPremium = 0;
        coverages.forEach(cov => {
            if (cov === 'vidros') additionalPremium += 200;
            if (cov === 'terceiros') additionalPremium += 400;
            if (cov === 'carro_reserva_7') additionalPremium += 100;
            if (cov === 'carro_reserva_15') additionalPremium += 200;
            if (cov === 'carro_reserva_30') additionalPremium += 350;
        });

        let total = basePremium + additionalPremium;
        let discount = 0;

        if (coupon === 'DANSEG10') {
            discount = total * 0.10;
            total -= discount;
        }

        const totalPix = total * 0.95;
        const totalInstallments = total / 12;

        return {
            basePremium,
            additionalPremium,
            discount,
            totalPix,
            totalInstallments
        };
    },

    generatePolicyId() {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `APO-${randomNum}`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DanSeguros;
} else {
    window.DanSeguros = DanSeguros;
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('insurance-form');
        const vehicleSelect = document.getElementById('vehicle');
        const fipeValueSpan = document.getElementById('fipe-value');
        const carroReservaCheckboxes = document.querySelectorAll('.carro-reserva');
        
        const simulationResult = document.getElementById('simulation-result');
        const basePremiumSpan = document.getElementById('base-premium');
        const additionalPremiumSpan = document.getElementById('additional-premium');
        const discountValueSpan = document.getElementById('discount-value');
        const totalPixSpan = document.getElementById('total-pix');
        const totalInstallmentsSpan = document.getElementById('total-installments');
        
        const issuePolicyBtn = document.getElementById('issue-policy');
        const policyResult = document.getElementById('policy-result');
        const policyNumberSpan = document.getElementById('policy-number');

        let currentSimulation = null;

        vehicleSelect.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value) || 0;
            fipeValueSpan.textContent = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        });

        carroReservaCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    carroReservaCheckboxes.forEach(cb => {
                        if (cb !== e.target) cb.checked = false;
                    });
                }
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fipe = parseFloat(vehicleSelect.value);
            if (!fipe) {
                alert('Por favor, selecione um veículo.');
                return;
            }

            const age = parseInt(document.getElementById('age').value, 10);
            const usage = document.getElementById('usage').value;
            const franchise = document.querySelector('input[name="franchise"]:checked').value;
            const coupon = document.getElementById('coupon').value.trim().toUpperCase();

            const coverages = Array.from(document.querySelectorAll('input[name="coverage"]:checked')).map(cb => cb.value);

            currentSimulation = DanSeguros.calculateInsurance({ fipe, age, usage, franchise, coverages, coupon });

            basePremiumSpan.textContent = currentSimulation.basePremium.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            additionalPremiumSpan.textContent = currentSimulation.additionalPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            discountValueSpan.textContent = currentSimulation.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            totalPixSpan.textContent = currentSimulation.totalPix.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            totalInstallmentsSpan.textContent = currentSimulation.totalInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            simulationResult.classList.remove('hidden');
            policyResult.classList.add('hidden');
        });

        issuePolicyBtn.addEventListener('click', () => {
            if (!currentSimulation) return;
            
            policyNumberSpan.textContent = DanSeguros.generatePolicyId();
            policyResult.classList.remove('hidden');
            simulationResult.classList.add('hidden');
        });
    });
}
