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
    assert.ok(labs.every(e => e.type === 'laboratorial'));
    
    const checkups = ClinicaExams.checkups();
    assert.ok(checkups.every(e => e.type === 'checkup'));
    assert.ok(checkups.length > 0);
});

test('returns null for unknown id', () => {
    const ClinicaExams = require(EXAMS_JS);
    assert.equal(ClinicaExams.find('unknown_id'), null);
});

test('findByType filters exams correctly', () => {
    const ClinicaExams = require(EXAMS_JS);
    const labExams = ClinicaExams.findByType('laboratorial');
    assert.ok(labExams.length > 0);
    assert.ok(labExams.every(e => e.type === 'laboratorial'));
});
