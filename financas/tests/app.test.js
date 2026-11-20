const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Dan Invest SPA', async (t) => {
    const scriptPath = path.join(__dirname, '../app.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    
    // Mock basico do DOM
    const listeners = {};
    const mockElements = {};

    class MockElement {
        constructor(id) {
            this.id = id;
            this.value = '';
            this.textContent = '';
            this.classList = {
                add: () => {},
                remove: () => {},
                contains: () => false
            };
            this.dataset = {};
            this.listeners = {};
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

    const document = {
        addEventListener: (evt, cb) => {
            if (!listeners[evt]) listeners[evt] = [];
            listeners[evt].push(cb);
        },
        querySelectorAll: (selector) => {
            if (selector === '.tab-btn') return [
                new MockElement('btn-simulador'),
                new MockElement('btn-regra')
            ];
            if (selector === '.tab-content') return [];
            return [];
        },
        getElementById: (id) => {
            if (!mockElements[id]) {
                mockElements[id] = new MockElement(id);
            }
            return mockElements[id];
        }
    };

    // Executa o script no contexto atual passando o mock document
    const scriptFunc = new Function('document', scriptContent);
    scriptFunc(document);

    // Dispara DOMContentLoaded
    if (listeners['DOMContentLoaded']) {
        listeners['DOMContentLoaded'].forEach(cb => cb());
    }

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

    await t.test('Diagnóstico INV-XXXX', () => {
        const btn = document.getElementById('btn-diagnostico');
        btn.dispatchEvent({ type: 'click' });
        const result = document.getElementById('diagnostico-result').textContent;
        assert.match(result, /Diagnóstico INV-\d{4} gerado/);
    });
});
