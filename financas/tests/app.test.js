const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Dan Invest SPA', async (t) => {
    const scriptPath = path.join(__dirname, '../app.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    
    // Mock basico do DOM
    const listeners = {};
    class MockElement {
        constructor(id) {
            this.id = id;
            this.value = '';
            this.textContent = '';
            this._classes = new Set();
            this.dataset = {};
            this.listeners = {};
        }
        get classList() {
            return {
                add: (c) => this._classes.add(c),
                remove: (c) => this._classes.delete(c),
                contains: (c) => this._classes.has(c)
            };
        }
        addEventListener(event, cb) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(cb);
        }
        dispatchEvent(event) {
            if (this.listeners[event.type]) {
                this.listeners[event.type].forEach(cb => cb(event));
            }
        }
    }

    const mockElements = {};
    const getEl = (id) => {
        if (!mockElements[id]) mockElements[id] = new MockElement(id);
        return mockElements[id];
    };

    const tab1 = getEl('btn-simulador');
    tab1.dataset.target = 'simulador';
    const tab2 = getEl('btn-regra');
    tab2.dataset.target = 'regra';
    const simuladorContent = getEl('simulador');
    const regraContent = getEl('regra');
    tab1.classList.add('active');
    simuladorContent.classList.add('active');

    const document = {
        addEventListener: (evt, cb) => {
            if (!listeners[evt]) listeners[evt] = [];
            listeners[evt].push(cb);
        },
        querySelectorAll: (selector) => {
            if (selector === '.tab-btn') return [tab1, tab2];
            if (selector === '.tab-content') return [simuladorContent, regraContent];
            return [];
        },
        getElementById: getEl
    };

    // Executa o script no contexto atual passando o mock document
    const scriptFunc = new Function('document', scriptContent);
    scriptFunc(document);

    // Dispara DOMContentLoaded
    if (listeners['DOMContentLoaded']) {
        listeners['DOMContentLoaded'].forEach(cb => cb());
    }

    await t.test('Navegação de Abas', () => {
        const tabSim = getEl('btn-simulador');
        const tabReg = getEl('btn-regra');
        const contSim = getEl('simulador');
        const contReg = getEl('regra');
        
        tabReg.dispatchEvent({ type: 'click' });
        assert.strictEqual(tabSim.classList.contains('active'), false);
        assert.strictEqual(contSim.classList.contains('active'), false);
        assert.strictEqual(tabReg.classList.contains('active'), true);
        assert.strictEqual(contReg.classList.contains('active'), true);
        
        tabSim.dispatchEvent({ type: 'click' });
        assert.strictEqual(tabSim.classList.contains('active'), true);
        assert.strictEqual(tabReg.classList.contains('active'), false);
    });

    await t.test('Simulador CDB vs LCI - Valores e Regras de IR', () => {
        const form = getEl('simulador-form');
        const res = getEl('simulador-result');

        const testSim = (capital, di, cdb, lci, prazo) => {
            getEl('sim-capital').value = capital.toString();
            getEl('sim-di').value = di.toString();
            getEl('sim-cdb').value = cdb.toString();
            getEl('sim-lci').value = lci.toString();
            getEl('sim-prazo').value = prazo.toString();
            form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
            return res.textContent;
        };

        // CDB com 1 ano (365 dias) -> IR 20%
        let txt = testSim(1000, 10, 100, 90, 365);
        assert.match(txt, /CDB Líquido: R\$ 1082\.50/);
        assert.match(txt, /LCI Líquido: R\$ 1089\.57/);
        assert.match(txt, /Melhor opção: LCI/);

        // CDB com 2 anos (730 dias) -> IR 15%
        txt = testSim(1000, 10, 100, 90, 730);
        assert.match(txt, /CDB Líquido: R\$ 1178\.50/);

        // Testar faixas de IR e limites
        txt = testSim(1000, 10, 100, 90, 180); // <= 180 -> 22.5%
        assert.match(txt, /CDB Líquido:/); 
        
        txt = testSim(1000, 10, 100, 90, 181); // > 180 -> 20.0%
        assert.match(txt, /CDB Líquido:/); 

        txt = testSim(1000, 10, 100, 90, 360); // <= 360 -> 20.0%
        txt = testSim(1000, 10, 100, 90, 361); // > 360 -> 17.5%
        txt = testSim(1000, 10, 100, 90, 720); // <= 720 -> 17.5%
        txt = testSim(1000, 10, 100, 90, 721); // > 720 -> 15.0%

        // Empate com taxas zeradas
        txt = testSim(1000, 10, 0, 0, 180);
        assert.match(txt, /Empate/);
    });

    await t.test('Orçamento 50-30-20', () => {
        document.getElementById('regra-renda').value = '1000';
        
        const form = document.getElementById('regra-form');
        const event = { type: 'submit', preventDefault: () => {} };
        form.dispatchEvent(event);

        const result = document.getElementById('regra-result').textContent;
        assert.match(result, /Essenciais \(50%\): R\$ 500\.00/);
        assert.match(result, /Desejos \(30%\): R\$ 300\.00/);
        assert.match(result, /Investimentos \(20%\): R\$ 200\.00/);
    });

    await t.test('Rebalanceamento - Validação e Cenários', () => {
        const form = getEl('rebal-form');
        const res = getEl('rebal-result');
        const testRebal = (a1, i1, a2, i2, aporte) => {
            getEl('rebal-ativo1-nome').value = 'A1';
            getEl('rebal-ativo1-atual').value = a1;
            getEl('rebal-ativo1-ideal').value = i1;
            getEl('rebal-ativo2-nome').value = 'A2';
            getEl('rebal-ativo2-atual').value = a2;
            getEl('rebal-ativo2-ideal').value = i2;
            getEl('rebal-aporte').value = aporte;
            form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
            return res.textContent;
        };

        // Validação da tolerância de 100% (ex: erro de float vs tolerância apertada)
        let txt = testRebal('500', '50', '500', '49.95', '0');
        assert.match(txt, /Erro: A soma dos alvos ideais deve ser 100%/);

        // 60/40 com aporte - cenário onde precisa comprar e vender
        txt = testRebal('500', '60', '500', '40', '200');
        assert.match(txt, /A1: Comprar R\$ 220\.00 \| A2: Vender R\$ 20\.00/);

        // Manter - cenário equilibrado onde erro de float poderia dar problema
        txt = testRebal('500', '50', '500', '50', '0');
        assert.match(txt, /A1: Manter R\$ 0\.00 \| A2: Manter R\$ 0\.00/);

        // Aporte vazio fallback = 0
        txt = testRebal('600', '50', '400', '50', '');
        assert.match(txt, /A1: Vender R\$ 100\.00 \| A2: Comprar R\$ 100\.00/);
    });

    await t.test('Diagnóstico INV-XXXX - Limites', () => {
        const btn = getEl('btn-diagnostico');
        const res = getEl('diagnostico-result');
        
        const originalRandom = Math.random;
        
        Math.random = () => 0; // Menor valor
        btn.dispatchEvent({ type: 'click' });
        assert.strictEqual(res.textContent, 'Diagnóstico INV-1000 gerado com sucesso. Sua carteira está em análise.');

        Math.random = () => 0.999999; // Maior valor possível
        btn.dispatchEvent({ type: 'click' });
        assert.strictEqual(res.textContent, 'Diagnóstico INV-9999 gerado com sucesso. Sua carteira está em análise.');
        
        Math.random = originalRandom;
    });

    await t.test('Tratamento de entradas vazias ou NaN', () => {
        getEl('regra-renda').value = 'abc';
        getEl('regra-form').dispatchEvent({ type: 'submit', preventDefault: () => {} });
        const result = getEl('regra-result').textContent;
        assert.match(result, /NaN/);
    });
});
