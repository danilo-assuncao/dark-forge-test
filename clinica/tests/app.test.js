const test = require('node:test');
const assert = require('node:assert');
const { specialists, exams } = require('../app.js');

test('Specialists data should be available and correctly formatted', () => {
    assert.strictEqual(Array.isArray(specialists), true, 'Specialists should be an array');
    assert.ok(specialists.length > 0, 'Should have at least one specialist');
    assert.ok(specialists[0].name, 'Specialist should have a name');
    assert.ok(specialists[0].specialty, 'Specialist should have a specialty');
});

test('Exams data should be available and have preparation instructions', () => {
    assert.strictEqual(Array.isArray(exams), true, 'Exams should be an array');
    assert.ok(exams.length > 0, 'Should have at least one exam');
    assert.ok(exams[0].name, 'Exam should have a name');
    assert.strictEqual(Array.isArray(exams[0].preparation), true, 'Exam preparation should be an array of instructions');
});

test('App.js functions should handle basic search logic (mocked DOM)', () => {
    // Basic test to verify we can filter specialists (simulating the search logic)
    const query = 'cardiologia';
    const results = specialists.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.specialty.toLowerCase().includes(query)
    );
    
    assert.strictEqual(results.length, 1, 'Should find exactly 1 cardiologist');
    assert.strictEqual(results[0].name, 'Dr. João Silva', 'Should find Dr. João Silva');
});
