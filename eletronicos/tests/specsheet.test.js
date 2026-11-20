const test = require('node:test');
const assert = require('node:assert');
const { generateProtocol, generateSpecsheetText } = require('../specsheet');

test('generateProtocol returns TECH- followed by 4 digits', () => {
    const p1 = generateProtocol();
    const p2 = generateProtocol();
    assert.match(p1, /^TECH-\d{4}$/);
    assert.match(p2, /^TECH-\d{4}$/);
});

test('generateSpecsheetText formats the text correctly', () => {
    const build = {
        cpu: { name: 'AMD Ryzen 5 5600' },
        gpu: { name: 'GeForce RTX 4060 8GB' }
    };
    
    const text = generateSpecsheetText(build, 400, 12);
    
    assert.match(text, /^Protocolo: TECH-\d{4}\nPeças: AMD Ryzen 5 5600, GeForce RTX 4060 8GB\nConsumo: 400W\nGarantia: 12 meses$/);
});

test('generateSpecsheetText handles empty build', () => {
    const text = generateSpecsheetText({}, 0, 12);
    assert.strictEqual(text, "Nenhuma peça selecionada.");
});
