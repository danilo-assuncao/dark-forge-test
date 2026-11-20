'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, STORAGE_KEY, generateProtocol } = require('../appointments.js');

function memStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    data,
  };
}

test('generateProtocol format', () => {
    const p1 = generateProtocol();
    assert.match(p1, /^MED-[0-9A-Z]{4}$/);
});

test('book appointment successfully', () => {
    const engine = createEngine(memStorage());
    const apt = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.ok(apt.protocol);
    assert.match(apt.protocol, /^MED-[0-9A-Z]{4}$/);
    assert.equal(apt.doctorId, 'doc-1');
    assert.equal(apt.date, '2023-10-15');
    assert.equal(apt.time, '09:00');
    assert.equal(apt.patientName, 'João Silva');
    assert.equal(apt.status, 'BOOKED');
    assert.ok(apt.createdAt);
});

test('prevent schedule conflict for same doctor, date and time', () => {
    const engine = createEngine(memStorage());
    engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.throws(() => {
        engine.book('doc-1', '2023-10-15', '09:00', 'Maria Souza');
    }, /Schedule conflict/);
    
    // Different time is fine
    const apt2 = engine.book('doc-1', '2023-10-15', '10:00', 'Maria Souza');
    assert.ok(apt2.protocol);

    // Different doctor is fine
    const apt3 = engine.book('doc-2', '2023-10-15', '09:00', 'Carlos');
    assert.ok(apt3.protocol);
    
    // Different date is fine
    const apt4 = engine.book('doc-1', '2023-10-16', '09:00', 'Ana');
    assert.ok(apt4.protocol);
});

test('allow booking at same time if previous appointment was cancelled', () => {
    const engine = createEngine(memStorage());
    const apt1 = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    engine.cancelAppointment(apt1.protocol, 'João Silva');
    
    // Now it should be allowed
    const apt2 = engine.book('doc-1', '2023-10-15', '09:00', 'Maria Souza');
    assert.equal(apt2.status, 'BOOKED');
});

test('persist to localStorage', () => {
    const st = memStorage();
    const engine1 = createEngine(st);
    
    engine1.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.ok(st.data.has(STORAGE_KEY));
    const raw = st.data.get(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].patientName, 'João Silva');
    
    // Restore
    const engine2 = createEngine(st);
    const all = engine2.getAllAppointments();
    assert.equal(all.length, 1);
    assert.equal(all[0].doctorId, 'doc-1');
});

test('handles missing fields', () => {
    const engine = createEngine(memStorage());
    
    assert.throws(() => engine.book(null, '2023-10-15', '09:00', 'João'), /Missing required fields/);
    assert.throws(() => engine.book('doc-1', null, '09:00', 'João'), /Missing required fields/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', null, 'João'), /Missing required fields/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '09:00', null), /Missing required fields/);
    
    assert.throws(() => engine.book('', '2023-10-15', '09:00', 'João'), /Fields cannot be empty/);
    assert.throws(() => engine.book('doc-1', '', '09:00', 'João'), /Fields cannot be empty/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '  ', 'João'), /Fields cannot be empty/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '09:00', ''), /Fields cannot be empty/);
    
    assert.throws(() => engine.book('doc-1', '2023-10-15', '09:00', 'A'.repeat(201)), /Patient name is too long/);
});

test('enforces format restrictions on date and time', () => {
    const engine = createEngine(memStorage());
    
    assert.throws(() => engine.book('doc-1', '10/15/2023', '09:00', 'João Silva'), /Invalid date format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15T00:00', '09:00', 'João Silva'), /Invalid date format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '9:00', 'João Silva'), /Invalid time format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '09:00:00', 'João Silva'), /Invalid time format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', 'abc', 'João Silva'), /Invalid time format/);
});

test('query by doctor and patient', () => {
    const engine = createEngine(memStorage());
    engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    engine.book('doc-1', '2023-10-15', '10:00', 'Maria Souza');
    engine.book('doc-2', '2023-10-15', '09:00', 'João Silva');
    
    const doc1Apts = engine.getAppointmentsByDoctor('doc-1');
    assert.equal(doc1Apts.length, 2);
    
    const doc2Apts = engine.getAppointmentsByDoctor('doc-2');
    assert.equal(doc2Apts.length, 1);
    
    const joaoApts = engine.getAppointmentsByPatient('joão silva');
    assert.equal(joaoApts.length, 2);
});

test('cancel appointment', () => {
    const st = memStorage();
    const engine = createEngine(st);
    const apt = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.throws(() => engine.cancelAppointment(apt.protocol, null), /Patient name is required/);
    assert.throws(() => engine.cancelAppointment(apt.protocol, 'Maria'), /Authorization failed/);
    
    assert.equal(engine.cancelAppointment('NON-EXISTENT', 'João Silva'), false);
    
    const cancelled = engine.cancelAppointment(apt.protocol, 'João Silva');
    assert.equal(cancelled, true);
    
    const all = engine.getAllAppointments();
    assert.equal(all[0].status, 'CANCELLED');
    
    // Idempotent
    assert.equal(engine.cancelAppointment(apt.protocol, 'João Silva'), true);
    
    // Reloading new engine after cancel
    const engine2 = createEngine(st);
    assert.equal(engine2.getAllAppointments()[0].status, 'CANCELLED');
    
    // Rebook after cancel and 3rd booking throws conflict
    engine.book('doc-1', '2023-10-15', '09:00', 'Maria Souza');
    assert.throws(() => engine.book('doc-1', '2023-10-15', '09:00', 'Pedro'), /Schedule conflict/);
});

test('mutating returned appointments does not alter engine state', () => {
    const engine = createEngine(memStorage());
    const apt = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    apt.status = 'CANCELLED';
    assert.equal(engine.getAllAppointments()[0].status, 'BOOKED');
    
    const byPatient = engine.getAppointmentsByPatient('João Silva');
    byPatient[0].status = 'CANCELLED';
    assert.equal(engine.getAllAppointments()[0].status, 'BOOKED');
    
    const byDoctor = engine.getAppointmentsByDoctor('doc-1');
    byDoctor[0].status = 'CANCELLED';
    assert.equal(engine.getAllAppointments()[0].status, 'BOOKED');
});

test('storage failure/corruption handling', () => {
    const st = memStorage();
    st.setItem(STORAGE_KEY, 'not-json');
    const engine1 = createEngine(st);
    assert.equal(engine1.getAllAppointments().length, 0);
    
    st.setItem(STORAGE_KEY, '{}');
    const engine2 = createEngine(st);
    assert.equal(engine2.getAllAppointments().length, 0);
    
    // Valid but malformed entries should be dropped
    st.setItem(STORAGE_KEY, JSON.stringify([
        { protocol: 'MED-1234', doctorId: 'doc', date: '2023-10-15', time: '09:00', patientName: 'A', status: 'BOOKED' },
        null,
        {},
        { protocol: '1234', doctorId: 'doc', date: '2023-10-15', time: '10:00', patientName: 'A', status: 'BOOKED' }, // Missing MED-
        { protocol: 'MED-2222', doctorId: '', date: '2023-10-15', time: '11:00', patientName: 'A', status: 'BOOKED' },
    ]));
    
    const engine3 = createEngine(st);
    assert.equal(engine3.getAllAppointments().length, 1);
    
    // Engine constructed with no storage works
    const engineNoStorage = createEngine(null);
    engineNoStorage.book('doc', '2023-10-15', '09:00', 'Test');
    assert.equal(engineNoStorage.getAllAppointments().length, 1);
    
    // Engine with storage whose setItem throws still keeps old memory for failure? Wait, we rollback memory now.
    const failingStorage = {
        getItem: () => null,
        setItem: () => { throw new Error('Quota exceeded'); }
    };
    const engineFailing = createEngine(failingStorage);
    assert.throws(() => engineFailing.book('doc', '2023-10-15', '09:00', 'Test'), /Failed to persist/);
    assert.equal(engineFailing.getAllAppointments().length, 0); // Rolled back
    
    // Cancellation failing
    const mockMem = memStorage();
    const engine4 = createEngine(mockMem);
    const apt = engine4.book('doc', '2023-10-15', '09:00', 'Test');
    
    // Inject fail
    mockMem.setItem = () => { throw new Error('Quota exceeded'); };
    assert.throws(() => engine4.cancelAppointment(apt.protocol, 'Test'), /Failed to persist cancellation/);
    assert.equal(engine4.getAllAppointments()[0].status, 'BOOKED'); // Rolled back
});

test('protocol collision retry and exhaustion paths', (t) => {
    let callCount = 0;
    // Mock Math.random to always return 0 (generates MED-0000)
    t.mock.method(Math, 'random', () => {
        callCount++;
        return 0; 
    });
    
    const engine = createEngine(memStorage());
    engine.book('doc-1', '2023-10-15', '09:00', 'A'); // First takes MED-0000
    
    assert.throws(() => {
        engine.book('doc-1', '2023-10-15', '10:00', 'B'); // Tries 100 times to get MED-0000 and fails
    }, /Failed to generate a unique protocol/);
    
    // Assert 1 attempt for first + 100 attempts for second, each calling random 4 times
    assert.equal(callCount, 404);
});

test('whitespace-padded duplicates and numeric doctorId', () => {
    const engine = createEngine(memStorage());
    engine.book(1, '2023-10-15', '09:00', 'A');
    
    assert.throws(() => {
        engine.book('1', '2023-10-15', '09:00', 'B');
    }, /Schedule conflict/);
    
    assert.throws(() => {
        engine.book(' 1 ', ' 2023-10-15 ', ' 09:00 ', ' B ');
    }, /Schedule conflict/);
});

