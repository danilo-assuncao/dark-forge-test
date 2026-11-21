// energia-solar/tests/app.test.js
const test = require('node:test');
const assert = require('node:assert');
const { initApp, getProposalBuilder } = require('../app.js');

test('getProposalBuilder returns a function', () => {
    const builder = getProposalBuilder();
    assert.strictEqual(typeof builder, 'function');
});

test('initApp does not throw in Node.js when window is missing', () => {
    assert.doesNotThrow(() => {
        initApp();
    });
});

test('Form submission updates DOM with valid results', () => {
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
    document.getElementById('months').value = '48';
    document.getElementById('coupon').value = 'DANSOLAR5';

    let defaultPrevented = false;
    const mockEvent = {
        preventDefault: () => { defaultPrevented = true; }
    };

    listeners['solar-form']['submit'](mockEvent);

    assert.strictEqual(defaultPrevented, true, 'preventDefault should be called');
    
    // Check results
    const resMethod = document.getElementById('res-paymentMethod').textContent;
    assert.strictEqual(resMethod, 'PIX');

    const resPrincipal = document.getElementById('res-principal').textContent;
    assert.ok(parseFloat(resPrincipal) > 0, 'Principal should be calculated');

    const errorContainer = document.getElementById('error-container');
    assert.strictEqual(errorContainer.classList.contains('hidden'), true, 'Error container should be hidden');

    const resultContainer = document.getElementById('result-container');
    assert.strictEqual(resultContainer.classList.contains('hidden'), false, 'Result container should be visible');
    
    // Clean up globals
    delete global.window;
    delete global.document;
});
