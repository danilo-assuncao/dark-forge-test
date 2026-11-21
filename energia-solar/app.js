// energia-solar/app.js

function getProposalBuilder() {
    if (typeof require !== 'undefined') {
        return require('./proposal.js').buildSolarProposal;
    }
    return window.__modules['proposal'].buildSolarProposal;
}

function initApp() {
    if (typeof window === 'undefined' || !window.document) return;

    const form = document.getElementById('solar-form');
    if (!form) return;

    const methodSelect = document.getElementById('method');
    const monthsGroup = document.getElementById('months-group');

    methodSelect.addEventListener('change', (e) => {
        if (e.target.value === 'price') {
            monthsGroup.style.display = 'block';
        } else {
            monthsGroup.style.display = 'none';
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const errorContainer = document.getElementById('error-container');
        const resultContainer = document.getElementById('result-container');
        
        errorContainer.classList.add('hidden');
        resultContainer.classList.add('hidden');

        try {
            const consumption = parseFloat(document.getElementById('consumption').value);
            const region = document.getElementById('region').value;
            const phaseType = document.getElementById('phaseType').value;
            const tariff = parseFloat(document.getElementById('tariff').value);
            const method = document.getElementById('method').value;
            const months = parseInt(document.getElementById('months').value, 10);
            const coupon = document.getElementById('coupon').value.trim();

            const buildSolarProposal = getProposalBuilder();

            const proposal = buildSolarProposal({
                monthlyConsumptionKwh: consumption,
                region: region,
                phaseType: phaseType,
                tariffBrlPerKwh: tariff,
                method: method,
                months: method === 'price' ? months : undefined,
                couponCode: coupon || undefined
            });

            document.getElementById('res-protocol').textContent = proposal.protocol;
            
            document.getElementById('res-requiredKwp').textContent = proposal.sizing.requiredKwp;
            document.getElementById('res-panels').textContent = proposal.sizing.panels;
            document.getElementById('res-installedKwp').textContent = proposal.sizing.installedKwp;
            document.getElementById('res-roofArea').textContent = proposal.sizing.roofArea;
            document.getElementById('res-estimatedCost').textContent = proposal.sizing.estimatedCost.toFixed(2);

            document.getElementById('res-monthlySavings').textContent = proposal.savings.monthlySavingsBrl.toFixed(2);
            document.getElementById('res-annualSavings').textContent = proposal.savings.annualSavingsBrl.toFixed(2);
            const payback = proposal.savings.paybackMonths;
            document.getElementById('res-payback').textContent = payback === Infinity ? 'Infinito' : payback.toFixed(1);

            document.getElementById('res-paymentMethod').textContent = proposal.financing.method.toUpperCase();
            document.getElementById('res-principal').textContent = proposal.financing.principal.toFixed(2);
            document.getElementById('res-paymentTotal').textContent = proposal.financing.total.toFixed(2);
            
            const installmentRow = document.getElementById('res-installment-row');
            if (proposal.financing.method === 'price') {
                installmentRow.classList.remove('hidden');
                document.getElementById('res-installment').textContent = proposal.financing.monthlyInstallment.toFixed(2);
                document.getElementById('res-months').textContent = proposal.financing.months;
            } else {
                installmentRow.classList.add('hidden');
            }

            const cfPositive = proposal.cashflowPositive;
            document.getElementById('res-cashflowPositive').textContent = cfPositive === null ? 'N/A' : (cfPositive ? 'Sim' : 'Não');

            resultContainer.classList.remove('hidden');

        } catch (error) {
            errorContainer.textContent = 'Erro ao gerar proposta: ' + error.message;
            errorContainer.classList.remove('hidden');
        }
    });
}

if (typeof window !== 'undefined' && window.document) {
    document.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initApp, getProposalBuilder };
}
