const assert = require('assert');
const { Inventory } = require('../parts');

function runTests() {
    console.log('Running Inventory tests...');
    let passed = 0;
    let failed = 0;

    const inventory = new Inventory();

    try {
        inventory.registerComponent('cpu1', 'Ryzen 5 5600X', 'AM4', 'DDR4', 65);
        const part = inventory.getComponent('cpu1');
        assert.strictEqual(part.name, 'Ryzen 5 5600X');
        assert.strictEqual(part.socket, 'AM4');
        assert.strictEqual(part.ramType, 'DDR4');
        assert.strictEqual(part.watts, 65);
        console.log('✅ should register a component with socket, ramType, and watts');
        passed++;
    } catch (e) {
        console.error('❌ should register a component with socket, ramType, and watts');
        console.error(e);
        failed++;
    }

    try {
        assert.throws(() => {
            inventory.registerComponent('cpu2', 'Core i9', 'LGA1700', 'DDR5'); // Missing watts
        }, /Invalid component specifications/);
        console.log('✅ should throw an error if specifications are missing or invalid');
        passed++;
    } catch (e) {
        console.error('❌ should throw an error if specifications are missing or invalid');
        console.error(e);
        failed++;
    }

    try {
        inventory.registerComponent('cpu3', 'Core i9', 'LGA1700', 'DDR5', 125);
        const parts = inventory.listComponents();
        assert.strictEqual(parts.length, 2);
        console.log('✅ should list all components');
        passed++;
    } catch (e) {
        console.error('❌ should list all components');
        console.error(e);
        failed++;
    }

    console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
