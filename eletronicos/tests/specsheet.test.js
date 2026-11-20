const test = require('node:test');
const assert = require('node:assert');
const { generateProtocol, generateSpecsheetText } = require('../specsheet');

test('generateProtocol formats boundaries correctly', (t) => {
    t.mock.method(Math, 'random', () => 0);
    assert.strictEqual(generateProtocol(), 'TECH-0000');
    
    t.mock.method(Math, 'random', () => 0.9999);
    assert.strictEqual(generateProtocol(), 'TECH-9999');
});

test('generateSpecsheetText formats the text correctly', (t) => {
    t.mock.method(Math, 'random', () => 0.1234);
    const build = {
        cpu: { name: 'AMD Ryzen 5 5600' },
        gpu: { name: 'GeForce RTX 4060 8GB' }
    };
    
    const text = generateSpecsheetText(build, 400, 12);
    
    assert.strictEqual(text, 'Protocolo: TECH-1234\nPeças: AMD Ryzen 5 5600, GeForce RTX 4060 8GB\nConsumo: 400W\nGarantia: 12 meses');
});

test('generateSpecsheetText formats 24 months and different watts', (t) => {
    t.mock.method(Math, 'random', () => 0.5678);
    const build = {
        cpu: { name: 'Intel Core i5-12400F' }
    };
    
    const text = generateSpecsheetText(build, 600, 24);
    
    assert.strictEqual(text, 'Protocolo: TECH-5678\nPeças: Intel Core i5-12400F\nConsumo: 600W\nGarantia: 24 meses');
});

test('generateSpecsheetText handles empty build', () => {
    const text = generateSpecsheetText({}, 0, 12);
    assert.strictEqual(text, "Nenhuma peça selecionada.");
});

test('generateSpecsheetText handles null or undefined slots in a mixed build', (t) => {
    t.mock.method(Math, 'random', () => 0.4321);
    const build = {
        cpu: null,
        gpu: { name: 'GeForce RTX 4060 8GB' },
        ram: undefined
    };
    
    const text = generateSpecsheetText(build, 250, 12);
    assert.strictEqual(text, 'Protocolo: TECH-4321\nPeças: GeForce RTX 4060 8GB\nConsumo: 250W\nGarantia: 12 meses');
});

test('generateSpecsheetText handles fully null build like an empty build', () => {
    const build = { cpu: null, gpu: null };
    const text = generateSpecsheetText(build, 0, 12);
    assert.strictEqual(text, "Nenhuma peça selecionada.");
});
