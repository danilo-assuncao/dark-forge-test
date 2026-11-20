'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const EXAMS_JS = path.join(__dirname, '..', 'exams.js');

test('loads in Node.js via require', () => {
    const ClinicaExams = require(EXAMS_JS);
    assert.ok(ClinicaExams.all().length > 0);
});

test('loads in browser-like environment via vm', () => {
    const code = fs.readFileSync(EXAMS_JS, 'utf8');
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    assert.ok(ctx.window.ClinicaExams);
    assert.ok(ctx.window.ClinicaExams.all().length > 0);
});

test('exposes prazos de laudos, precos e jejum', () => {
    const ClinicaExams = require(EXAMS_JS);
    const hemograma = ClinicaExams.find('hemograma');
    assert.equal(hemograma.name, 'Hemograma Completo');
    assert.equal(hemograma.price, 25.00);
    assert.equal(hemograma.fastingHours, 8);
    assert.equal(hemograma.turnaroundDays, 1);
});

test('differentiates laboratorial and checkups', () => {
    const ClinicaExams = require(EXAMS_JS);
    const labs = ClinicaExams.labExams();
    assert.ok(labs.length > 0);
    assert.ok(labs.every(e => e.type === 'laboratorial'));
    
    const checkups = ClinicaExams.checkups();
    assert.ok(checkups.length > 0);
    assert.ok(checkups.every(e => e.type === 'checkup'));
    
    assert.equal(labs.length + checkups.length, ClinicaExams.all().length);
});

test('returns null for unknown id or edge case inputs', () => {
    const ClinicaExams = require(EXAMS_JS);
    assert.equal(ClinicaExams.find('unknown_id'), null);
    assert.equal(ClinicaExams.find(undefined), null);
    assert.equal(ClinicaExams.find(''), null);
    assert.equal(ClinicaExams.find(null), null);
});

test('findByType filters exams correctly', () => {
    const ClinicaExams = require(EXAMS_JS);
    const labExams = ClinicaExams.findByType('laboratorial');
    assert.ok(labExams.length > 0);
    assert.ok(labExams.every(e => e.type === 'laboratorial'));
    
    assert.deepEqual(ClinicaExams.findByType('nonexistent'), []);
});

test('data integrity of the catalog: unique ids, types, limits and valid included ids', () => {
    const ClinicaExams = require(EXAMS_JS);
    const all = ClinicaExams.all();
    const ids = new Set();
    
    all.forEach(exam => {
        // Assert unique id
        assert.ok(!ids.has(exam.id), `Duplicate ID found: ${exam.id}`);
        ids.add(exam.id);
        
        // Structure checks
        assert.equal(typeof exam.price, 'number');
        assert.ok(exam.price > 0, `Price should be > 0 for ${exam.id}`);
        
        assert.equal(typeof exam.fastingHours, 'number');
        assert.ok(exam.fastingHours >= 0, `fastingHours >= 0 for ${exam.id}`);
        assert.ok(Number.isInteger(exam.fastingHours));
        
        assert.equal(typeof exam.turnaroundDays, 'number');
        assert.ok(exam.turnaroundDays >= 1, `turnaroundDays >= 1 for ${exam.id}`);
        assert.ok(Number.isInteger(exam.turnaroundDays));
        
        if (exam.type === 'checkup') {
            assert.ok(Array.isArray(exam.included));
            assert.ok(exam.included.length > 0);
            
            let maxFasting = 0;
            let maxTurnaround = 0;
            
            exam.included.forEach(incId => {
                const incExam = ClinicaExams.find(incId);
                assert.ok(incExam, `Included exam ${incId} not found in checkup ${exam.id}`);
                assert.equal(incExam.type, 'laboratorial', `Included exam ${incId} must be laboratorial`);
                
                maxFasting = Math.max(maxFasting, incExam.fastingHours);
                maxTurnaround = Math.max(maxTurnaround, incExam.turnaroundDays);
            });
            
            assert.ok(exam.fastingHours >= maxFasting, `Checkup ${exam.id} fastingHours too low`);
            assert.ok(exam.turnaroundDays >= maxTurnaround, `Checkup ${exam.id} turnaroundDays too low`);
        }
    });
});

test('pricing/fasting/turnaround checked for specific boundaries', () => {
    const ClinicaExams = require(EXAMS_JS);
    
    // Explicit assertions for the fasting=0 case
    const vitD = ClinicaExams.find('vitamina_d');
    assert.equal(vitD.fastingHours, 0);
    assert.equal(vitD.turnaroundDays, 3);
    
    // Checkup price/turnaround
    const checkupBasico = ClinicaExams.find('checkup_basico');
    assert.equal(checkupBasico.price, 120.00);
    assert.equal(checkupBasico.turnaroundDays, 2);
});

test('catalog entries and exports are immutable', () => {
    const ClinicaExams = require(EXAMS_JS);
    const all = ClinicaExams.all();
    
    assert.throws(() => {
        all.push({ id: 'novo', name: 'Novo', type: 'laboratorial', price: 10, fastingHours: 0, turnaroundDays: 1 });
    }, /object is not extensible|Cannot add property/);
    
    const hemograma = ClinicaExams.find('hemograma');
    assert.throws(() => {
        hemograma.price = 0;
    }, /Cannot assign to read only property/);
    
    const checkup = ClinicaExams.find('checkup_basico');
    assert.throws(() => {
        checkup.included.push('novo');
    }, /object is not extensible|Cannot add property/);
    
    assert.throws(() => {
        ClinicaExams.find = () => null;
    }, /Cannot assign to read only property/);
});
