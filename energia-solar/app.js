// energia-solar/app.js

function getProposalBuilder() {
    if (typeof window !== 'undefined' && window.__modules && window.__modules['proposal']) {
        return window.__modules['proposal'].buildSolarProposal;
    }
    return require('./proposal').buildSolarProposal;
}

function safeFormat(val, decimals = 2) {
    return (typeof val === 'number' && !Number.isNaN(val)) ? val.toFixed(decimals) : 'N/A';
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
            const monthsStr = document.getElementById('months').value;
            const months = method === 'price' ? parseInt(monthsStr, 10) : undefined;
            if (method === 'price' && isNaN(months)) throw new Error('Número de parcelas inválido');
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
            document.getElementById('res-estimatedCost').textContent = safeFormat(proposal.sizing.estimatedCost);

            document.getElementById('res-monthlySavings').textContent = safeFormat(proposal.savings.monthlySavingsBrl);
            document.getElementById('res-annualSavings').textContent = safeFormat(proposal.savings.annualSavingsBrl);
            const payback = proposal.savings.paybackMonths;
            document.getElementById('res-payback').textContent = payback === Infinity ? 'Infinito' : safeFormat(payback, 1);

            document.getElementById('res-paymentMethod').textContent = proposal.financing.method.toUpperCase();
            document.getElementById('res-principal').textContent = safeFormat(proposal.financing.principal);
            document.getElementById('res-paymentTotal').textContent = safeFormat(proposal.financing.total);
            
            const installmentRow = document.getElementById('res-installment-row');
            if (proposal.financing.method === 'price') {
                installmentRow.classList.remove('hidden');
                document.getElementById('res-installment').textContent = safeFormat(proposal.financing.monthlyInstallment);
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
