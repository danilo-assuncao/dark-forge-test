const test = require('node:test');
const assert = require('node:assert');
const { specialists, exams, searchSpecialists, buildPreparation, validateBooking, normalizeText } = require('../app.js');

test('Specialists data should be available and correctly formatted', () => {
    assert.strictEqual(Array.isArray(specialists), true, 'Specialists should be an array');
    assert.ok(specialists.length > 0, 'Should have at least one specialist');
    
    specialists.forEach(s => {
        assert.ok(s.id, 'Specialist should have an id');
        assert.ok(s.name, 'Specialist should have a non-empty name');
        assert.ok(s.specialty, 'Specialist should have a non-empty specialty');
    });

    const ids = specialists.map(s => s.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'Specialist ids should be unique');
});

test('Exams data should be available and have preparation instructions', () => {
    assert.strictEqual(Array.isArray(exams), true, 'Exams should be an array');
    assert.ok(exams.length > 0, 'Should have at least one exam');
    
    exams.forEach(e => {
        assert.ok(typeof e.id === 'string' && e.id.length > 0, 'Exam should have a string id');
        assert.ok(e.name, 'Exam should have a name');
        assert.strictEqual(Array.isArray(e.preparation), true, 'Exam preparation should be an array');
        assert.ok(e.preparation.length > 0, 'Exam preparation should have at least one instruction');
        
        e.preparation.forEach(p => {
            assert.ok(typeof p === 'string' && p.length > 0, 'Preparation instruction should be a non-empty string');
        });
    });

    const ids = exams.map(e => e.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'Exam ids should be unique');
});

test('normalizeText should remove accents and lower case', () => {
    assert.strictEqual(normalizeText('Joao'), 'joao');
    assert.strictEqual(normalizeText('João'), 'joao');
    assert.strictEqual(normalizeText('  JoãO   '), 'joao');
    assert.strictEqual(normalizeText('PEDIATRIA'), 'pediatria');
});

test('searchSpecialists logic', () => {
    // case insensitive and accent insensitive
    let results = searchSpecialists('joao');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Dr. João Silva');

    results = searchSpecialists('João');
    assert.strictEqual(results.length, 1);
    
    results = searchSpecialists(' dermato ');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].specialty, 'Dermatologia');

    results = searchSpecialists('');
    assert.strictEqual(results.length, 0, 'Empty query should return empty array');

    results = searchSpecialists('   ');
    assert.strictEqual(results.length, 0, 'Whitespace query should return empty array');

    results = searchSpecialists('Unknown Specialty');
    assert.strictEqual(results.length, 0, 'No match should return empty array');
});

test('validateBooking logic', () => {
    // Missing fields
    let res = validateBooking('', '2027-01-01', '10:00', 'João');
    assert.strictEqual(res.valid, false);
    
    res = validateBooking('1', '', '10:00', 'João');
    assert.strictEqual(res.valid, false);

    res = validateBooking('1', '2027-01-01', '', 'João');
    assert.strictEqual(res.valid, false);

    res = validateBooking('1', '2027-01-01', '10:00', '');
    assert.strictEqual(res.valid, false);
    
    res = validateBooking('1', '2027-01-01', '10:00', '   ');
    assert.strictEqual(res.valid, false);

    // Past date
    res = validateBooking('1', '2000-01-01', '10:00', 'João Silva');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'A data não pode ser no passado.');

    // Valid
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    res = validateBooking('1', futureDateStr, '10:00', ' João Silva  ');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.name, 'João Silva', 'Name should be trimmed');
});

test('buildPreparation logic', () => {
    let results = buildPreparation([]);
    assert.strictEqual(results.length, 0);

    results = buildPreparation(['hemograma']);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Hemograma Completo');

    results = buildPreparation(['hemograma', 'raiox']);
    assert.strictEqual(results.length, 2);

    results = buildPreparation(['unknown_exam']);
    assert.strictEqual(results.length, 0);
    
    results = buildPreparation(['hemograma', 'unknown_exam']);
    assert.strictEqual(results.length, 1);
});
