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
    const p2 = generateProtocol();
    assert.match(p1, /^MED-[0-9A-Z]{4}$/);
    assert.match(p2, /^MED-[0-9A-Z]{4}$/);
    // Usually unique
    assert.notEqual(p1, p2);
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
    
    engine.cancelAppointment(apt1.protocol);
    
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
    assert.throws(() => engine.book('doc-1', '', '09:00', 'João'), /Fields cannot be empty/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '  ', 'João'), /Fields cannot be empty/);
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
    const engine = createEngine(memStorage());
    const apt = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.equal(engine.cancelAppointment('NON-EXISTENT'), false);
    
    const cancelled = engine.cancelAppointment(apt.protocol);
    assert.equal(cancelled, true);
    
    const all = engine.getAllAppointments();
    assert.equal(all[0].status, 'CANCELLED');
});
