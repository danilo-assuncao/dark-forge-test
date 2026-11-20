document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const targetEl = document.getElementById(target);
            if (!targetEl) return;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            targetEl.classList.add('active');
        });
    });

    // Simulador CDB vs LCI
    const simuladorForm = document.getElementById('simulador-form');
    if (simuladorForm) {
        simuladorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const capital = parseFloat(document.getElementById('sim-capital').value);
            const diAnual = parseFloat(document.getElementById('sim-di').value);
            const percCdb = parseFloat(document.getElementById('sim-cdb').value);
            const percLci = parseFloat(document.getElementById('sim-lci').value);
            const prazoDias = parseInt(document.getElementById('sim-prazo').value, 10);

            // Cálculos simplificados (Juros Compostos ao dia - aproximação 252 dias úteis)
            const taxaDiDiaria = Math.pow(1 + (diAnual / 100), 1 / 252) - 1;
            const diasUteisAprox = prazoDias * (252 / 365);

            const taxaCdbDiaria = taxaDiDiaria * (percCdb / 100);
            const taxaLciDiaria = taxaDiDiaria * (percLci / 100);

            const brutoCdb = capital * Math.pow(1 + taxaCdbDiaria, diasUteisAprox);
            const brutoLci = capital * Math.pow(1 + taxaLciDiaria, diasUteisAprox);

            // Imposto de Renda CDB
            let aliquotaIr = 0.225;
            if (prazoDias > 180 && prazoDias <= 360) aliquotaIr = 0.20;
            else if (prazoDias > 360 && prazoDias <= 720) aliquotaIr = 0.175;
            else if (prazoDias > 720) aliquotaIr = 0.15;

            const lucroCdb = brutoCdb - capital;
            const irCdb = lucroCdb * aliquotaIr;
            const liquidoCdb = brutoCdb - irCdb;
            const liquidoLci = brutoLci; // isento

            let melhorOpcao = 'Empate';
            const dif = liquidoCdb - liquidoLci;
            if (dif > 0.001) melhorOpcao = 'CDB';
            else if (dif < -0.001) melhorOpcao = 'LCI';

            const resultDiv = document.getElementById('simulador-result');
            resultDiv.textContent = `CDB Líquido: R$ ${liquidoCdb.toFixed(2)} | LCI Líquido: R$ ${liquidoLci.toFixed(2)} | Melhor opção: ${melhorOpcao}`;
        });
    }

    // Regra 50-30-20
    const regraForm = document.getElementById('regra-form');
    if (regraForm) {
        regraForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const renda = parseFloat(document.getElementById('regra-renda').value);

            const essenciais = renda * 0.5;
            const desejos = renda * 0.3;
            const investimentos = renda * 0.2;

            const resultDiv = document.getElementById('regra-result');
            resultDiv.textContent = `Essenciais (50%): R$ ${essenciais.toFixed(2)} | Desejos (30%): R$ ${desejos.toFixed(2)} | Investimentos (20%): R$ ${investimentos.toFixed(2)}`;
        });
    }

    // Rebalanceamento
    const rebalForm = document.getElementById('rebal-form');
    if (rebalForm) {
        rebalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome1 = document.getElementById('rebal-ativo1-nome').value;
            const atual1 = parseFloat(document.getElementById('rebal-ativo1-atual').value);
            const ideal1 = parseFloat(document.getElementById('rebal-ativo1-ideal').value);

            const nome2 = document.getElementById('rebal-ativo2-nome').value;
            const atual2 = parseFloat(document.getElementById('rebal-ativo2-atual').value);
            const ideal2 = parseFloat(document.getElementById('rebal-ativo2-ideal').value);

            const aporte = parseFloat(document.getElementById('rebal-aporte').value) || 0;

            if (Math.abs((ideal1 + ideal2) - 100) > 1e-9) {
                document.getElementById('rebal-result').textContent = "Erro: A soma dos alvos ideais deve ser 100%.";
                return;
            }

            const totalAtual = atual1 + atual2;
            const totalFuturo = totalAtual + aporte;

            const meta1 = totalFuturo * (ideal1 / 100);
            const meta2 = totalFuturo * (ideal2 / 100);

            const dif1 = meta1 - atual1;
            const dif2 = meta2 - atual2;

            const formatDif = (val) => {
                const centVal = Math.round(val * 100) / 100;
                if (centVal === 0) return 'Manter R$ 0.00';
                return centVal > 0 ? `Comprar R$ ${centVal.toFixed(2)}` : `Vender R$ ${Math.abs(centVal).toFixed(2)}`;
            };

            const resultDiv = document.getElementById('rebal-result');
            resultDiv.textContent = `${nome1}: ${formatDif(dif1)} | ${nome2}: ${formatDif(dif2)}`;
        });
    }

    // Diagnóstico
    const btnDiagnostico = document.getElementById('btn-diagnostico');
    if (btnDiagnostico) {
        btnDiagnostico.addEventListener('click', () => {
            const resultDiv = document.getElementById('diagnostico-result');
            const id = Math.floor(Math.random() * 9000) + 1000;
            resultDiv.textContent = `Diagnóstico INV-${id} gerado com sucesso. Sua carteira está em análise.`;
        });
    }
});
