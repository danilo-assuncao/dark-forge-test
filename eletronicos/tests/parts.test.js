const assert = require('assert');
const { Inventory } = require('../parts');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ ${name}`);
        console.error(e);
        failed++;
    }
}

function runTests() {
    console.log('Running Inventory tests...');

    test('should register a component with valid string fields and watts', () => {
        const inventory = new Inventory();
        inventory.registerComponent('cpu1', 'Ryzen 5 5600X', 'AM4', 'DDR4', 65);
        const part = inventory.getComponent('cpu1');
        assert.strictEqual(part.name, 'Ryzen 5 5600X');
        assert.strictEqual(part.socket, 'AM4');
        assert.strictEqual(part.ramType, 'DDR4');
        assert.strictEqual(part.watts, 65);
        
        // Ensure watts=0 is also valid
        inventory.registerComponent('cpu2', 'Low Power', 'Custom', 'LPDDR5', 0);
        assert.strictEqual(inventory.getComponent('cpu2').watts, 0);
    });

    test('should throw an error for duplicate IDs', () => {
        const inventory = new Inventory();
        inventory.registerComponent('cpu1', 'Ryzen 5 5600X', 'AM4', 'DDR4', 65);
        assert.throws(() => {
            inventory.registerComponent('cpu1', 'Core i9', 'LGA1700', 'DDR5', 125);
        }, /already exists/);
        assert.strictEqual(inventory.listComponents().length, 1);
        assert.strictEqual(inventory.getComponent('cpu1').name, 'Ryzen 5 5600X');
    });

    test('should throw an error if string specifications are missing, empty or invalid', () => {
        const inventory = new Inventory();
        
        const invalidStrings = [undefined, null, '', '   ', 5, {}];
        
        for (const invalid of invalidStrings) {
            assert.throws(() => inventory.registerComponent(invalid, 'Name', 'AM4', 'DDR4', 65), /Invalid component specifications/);
            assert.throws(() => inventory.registerComponent('id', invalid, 'AM4', 'DDR4', 65), /Invalid component specifications/);
            assert.throws(() => inventory.registerComponent('id', 'Name', invalid, 'DDR4', 65), /Invalid component specifications/);
            assert.throws(() => inventory.registerComponent('id', 'Name', 'AM4', invalid, 65), /Invalid component specifications/);
        }
        
        assert.strictEqual(inventory.listComponents().length, 0);
    });

    test('should throw an error if watts is not a finite positive number', () => {
        const inventory = new Inventory();
        
        const invalidWatts = [undefined, null, NaN, Infinity, -Infinity, -1, '65', {}, []];
        
        for (const invalid of invalidWatts) {
            assert.throws(() => {
                inventory.registerComponent('cpuX', 'Core i9', 'LGA1700', 'DDR5', invalid);
            }, /Invalid component specifications/);
        }
        
        assert.strictEqual(inventory.listComponents().length, 0);
    });

    test('should return undefined for a missing component ID', () => {
        const inventory = new Inventory();
        assert.strictEqual(inventory.getComponent('missing'), undefined);
    });

    test('should return copies of internal objects to prevent mutation', () => {
        const inventory = new Inventory();
        inventory.registerComponent('cpu1', 'Ryzen 5', 'AM4', 'DDR4', 65);
        
        const part = inventory.getComponent('cpu1');
        part.watts = -100;
        
        const originalPart = inventory.getComponent('cpu1');
        assert.strictEqual(originalPart.watts, 65);
        
        const list = inventory.listComponents();
        list[0].watts = -50;
        
        const untouchedPart = inventory.getComponent('cpu1');
        assert.strictEqual(untouchedPart.watts, 65);
    });

    test('should list all registered components correctly', () => {
        const inventory = new Inventory();
        assert.deepStrictEqual(inventory.listComponents(), []);
        
        inventory.registerComponent('cpu1', 'Ryzen', 'AM4', 'DDR4', 65);
        inventory.registerComponent('cpu2', 'Core', 'LGA1700', 'DDR5', 125);
        
        const parts = inventory.listComponents();
        assert.strictEqual(parts.length, 2);
        assert.strictEqual(parts[0].id, 'cpu1');
        assert.strictEqual(parts[1].id, 'cpu2');
    });

    console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
