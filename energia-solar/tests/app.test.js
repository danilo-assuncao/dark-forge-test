// energia-solar/tests/app.test.js
const test = require('node:test');
const assert = require('node:assert');
const { initApp, getProposalBuilder } = require('../app.js');

function setupDOMMock() {
    const elements = {};
    const listeners = {};
    
    global.document = {
        getElementById(id) {
            if (!elements[id]) {
                elements[id] = {
                    value: '',
                    textContent: '',
                    style: {},
                    classList: {
                        classes: new Set(),
                        add(c) { this.classes.add(c); },
                        remove(c) { this.classes.delete(c); },
                        contains(c) { return this.classes.has(c); }
                    },
                    addEventListener(event, fn) {
                        if (!listeners[id]) listeners[id] = {};
                        listeners[id][event] = fn;
                    }
                };
            }
            return elements[id];
        }
    };
    global.window = { document: global.document };
    
    return { elements, listeners };
}

function cleanupDOMMock() {
    delete global.window;
    delete global.document;
}

test('getProposalBuilder returns a function via Node require', () => {
    const builder = getProposalBuilder();
    assert.strictEqual(typeof builder, 'function');
});

test('getProposalBuilder returns a function via browser shim', () => {
    global.window = {
        __modules: {
            'proposal': { buildSolarProposal: () => 'shim' }
        }
    };
    try {
        const builder = getProposalBuilder();
        assert.strictEqual(typeof builder, 'function');
        assert.strictEqual(builder(), 'shim');
    } finally {
        delete global.window;
    }
});

test('initApp does not throw in Node.js when window is missing', () => {
    assert.doesNotThrow(() => {
        initApp();
    });
});

test('Form submission updates DOM with valid results for PIX', () => {
    const { listeners } = setupDOMMock();
    try {
        // Ensure form fields exist
        document.getElementById('solar-form');
        document.getElementById('method');
        document.getElementById('months-group');

        initApp();

        assert.ok(listeners['solar-form']['submit'], 'Submit listener should be registered');

        // Simulate DOM input
        document.getElementById('consumption').value = '500';
        document.getElementById('region').value = 'sudeste';
        document.getElementById('phaseType').value = 'bifasico';
        document.getElementById('tariff').value = '0.9';
        document.getElementById('method').value = 'pix';
        document.getElementById('coupon').value = 'DANSOLAR5';

        let defaultPrevented = false;
        const mockEvent = {
            preventDefault: () => { defaultPrevented = true; }
        };

        listeners['solar-form']['submit'](mockEvent);

        assert.strictEqual(defaultPrevented, true, 'preventDefault should be called');
        
        // Check results
        assert.strictEqual(document.getElementById('res-paymentMethod').textContent, 'PIX');
        assert.ok(parseFloat(document.getElementById('res-principal').textContent) > 0, 'Principal should be calculated');
        assert.strictEqual(document.getElementById('res-cashflowPositive').textContent, 'N/A');

        assert.strictEqual(document.getElementById('error-container').classList.contains('hidden'), true);
        assert.strictEqual(document.getElementById('result-container').classList.contains('hidden'), false);
    } finally {
        cleanupDOMMock();
    }
});

test('Form submission updates DOM with valid results for PRICE financing', () => {
    const { listeners } = setupDOMMock();
    try {
        document.getElementById('solar-form');
        document.getElementById('method');
        document.getElementById('months-group');

        initApp();

        // Simulate change event for method
        document.getElementById('method').value = 'price';
        let methodEvent = { target: { value: 'price' } };
        if (listeners['method'] && listeners['method']['change']) {
            listeners['method']['change'](methodEvent);
            assert.strictEqual(document.getElementById('months-group').style.display, 'block');
        }

        document.getElementById('consumption').value = '500';
        document.getElementById('region').value = 'sudeste';
        document.getElementById('phaseType').value = 'bifasico';
        document.getElementById('tariff').value = '0.9';
        document.getElementById('method').value = 'price';
        document.getElementById('months').value = '48';
        
        listeners['solar-form']['submit']({ preventDefault: () => {} });

        assert.strictEqual(document.getElementById('res-paymentMethod').textContent, 'PRICE');
        assert.ok(parseFloat(document.getElementById('res-installment').textContent) > 0);
        const cashflow = document.getElementById('res-cashflowPositive').textContent;
        assert.ok(['Sim', 'Não'].includes(cashflow));
        
        assert.strictEqual(document.getElementById('res-installment-row').classList.contains('hidden'), false);
    } finally {
        cleanupDOMMock();
    }
});

test('Form submission shows error on invalid input', () => {
    const { listeners } = setupDOMMock();
    try {
        document.getElementById('solar-form');
        initApp();

        document.getElementById('consumption').value = 'invalid';
        document.getElementById('region').value = ''; 
        
        listeners['solar-form']['submit']({ preventDefault: () => {} });

        const errorContainer = document.getElementById('error-container');
        assert.strictEqual(errorContainer.classList.contains('hidden'), false, 'Error container should be visible');
        assert.ok(errorContainer.textContent.startsWith('Erro ao gerar proposta:'));
        assert.strictEqual(document.getElementById('result-container').classList.contains('hidden'), true);
    } finally {
        cleanupDOMMock();
    }
});
