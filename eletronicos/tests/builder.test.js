const assert = require('assert');
const { Inventory } = require('../parts');
const { SetupValidator } = require('../builder');

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
    console.log('Running SetupValidator tests...');

    const inventory = new Inventory();
    inventory.registerComponent('cpu-ryzen', 'Ryzen 5 5600X', 'AM4', 'DDR4', 65);
    inventory.registerComponent('cpu-intel', 'Core i5 12400', 'LGA1700', 'DDR4', 65);
    inventory.registerComponent('mb-am4', 'B550', 'AM4', 'DDR4', 40);
    inventory.registerComponent('mb-lga1700', 'B660', 'LGA1700', 'DDR4', 40);
    inventory.registerComponent('mb-am5', 'X670', 'AM5', 'DDR5', 50);
    inventory.registerComponent('psu-500w', 'Fonte 500W', 'N/A', 'N/A', 500);
    inventory.registerComponent('psu-200w', 'Fonte 200W', 'N/A', 'N/A', 200);
    inventory.registerComponent('gpu-rtx', 'RTX 3060', 'PCIe', 'GDDR6', 170);

    const validator = new SetupValidator(inventory);

    test('setup válido: cpu e mb compatíveis, consumo dentro do limite da fonte', () => {
        const result = validator.validate({
            cpuId: 'cpu-ryzen',
            motherboardId: 'mb-am4',
            psuId: 'psu-500w'
        });
        
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.warnings.length, 0);
    });

    test('setup inválido: cpu e mb com sockets diferentes', () => {
        const result = validator.validate({
            cpuId: 'cpu-intel',
            motherboardId: 'mb-am4',
            psuId: 'psu-500w'
        });
        
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('socket'));
    });

    test('setup aviso: consumo com margem excede fonte', () => {
        // cpu = 65W, mb = 40W, gpu = 170W -> total 275W
        // 275 * 1.25 = 343.75W
        // psu = 200W
        const result = validator.validate({
            cpuId: 'cpu-ryzen',
            motherboardId: 'mb-am4',
            psuId: 'psu-200w',
            otherComponentIds: ['gpu-rtx']
        });
        
        assert.strictEqual(result.isValid, true); // Still valid components
        assert.strictEqual(result.warnings.length, 1);
        assert.ok(result.warnings[0].includes('excede a capacidade'));
    });

    test('setup erro: componentes não encontrados', () => {
        const result = validator.validate({
            cpuId: 'cpu-ryzen2',
            motherboardId: 'mb-am4'
        });
        
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('não encontrado'));
    });

    console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
