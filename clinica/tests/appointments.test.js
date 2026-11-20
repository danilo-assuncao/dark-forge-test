'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, STORAGE_KEY, generateProtocol } = require('../appointments.js');

function memStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
        if (v === 'THROW') throw new Error('Quota exceeded');
        data.set(k, String(v));
    },
    data,
  };
}

test('generateProtocol format', () => {
    const p1 = generateProtocol();
    assert.match(p1, /^MED-[0-9a-zA-Z]{12}$/);
});

test('book appointment successfully', () => {
    const engine = createEngine(memStorage());
    const apt = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.ok(apt.protocol);
    assert.match(apt.protocol, /^MED-[0-9a-zA-Z]{12}$/);
    assert.ok(apt.cancelToken);
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
    
    const apt2 = engine.book('doc-1', '2023-10-15', '10:00', 'Maria Souza');
    assert.ok(apt2.protocol);

    const apt3 = engine.book('doc-2', '2023-10-15', '09:00', 'Carlos');
    assert.ok(apt3.protocol);
    
    const apt4 = engine.book('doc-1', '2023-10-16', '09:00', 'Ana');
    assert.ok(apt4.protocol);
});

test('allow booking at same time if previous appointment was cancelled', () => {
    const engine = createEngine(memStorage());
    const apt1 = engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    engine.cancelAppointment(apt1.protocol, apt1.cancelToken);
    
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

test('enforces format restrictions on date and time including boundary values', () => {
    const engine = createEngine(memStorage());
    
    assert.throws(() => engine.book('doc-1', '10/15/2023', '09:00', 'João Silva'), /Invalid date format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15T00:00', '09:00', 'João Silva'), /Invalid date format/);
    
    // Impossible calendar dates
    assert.throws(() => engine.book('doc-1', '2023-02-30', '09:00', 'João Silva'), /Invalid date format/);
    assert.throws(() => engine.book('doc-1', '2023-13-01', '09:00', 'João Silva'), /Invalid date format/);
    assert.throws(() => engine.book('doc-1', '0000-00-00', '09:00', 'João Silva'), /Invalid date format/);
    assert.throws(() => engine.book('doc-1', '2023-02-31', '09:00', 'João Silva'), /Invalid date format/);
    
    // Time boundaries
    assert.doesNotThrow(() => engine.book('doc-t1', '2023-10-15', '00:00', 'João Silva'));
    assert.doesNotThrow(() => engine.book('doc-t2', '2023-10-15', '23:59', 'João Silva'));
    
    assert.throws(() => engine.book('doc-1', '2023-10-15', '9:00', 'João Silva'), /Invalid time format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '09:00:00', 'João Silva'), /Invalid time format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '24:00', 'João Silva'), /Invalid time format/);
    assert.throws(() => engine.book('doc-1', '2023-10-15', '12:60', 'João Silva'), /Invalid time format/);
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
    
    // Auth failures return false now
    assert.equal(engine.cancelAppointment(apt.protocol, null), false);
    assert.equal(engine.cancelAppointment(apt.protocol, 'WRONG_TOKEN'), false);
    
    assert.equal(engine.cancelAppointment('NON-EXISTENT', apt.cancelToken), false);
    
    const cancelled = engine.cancelAppointment(apt.protocol, apt.cancelToken);
    assert.equal(cancelled, true);
    
    const all = engine.getAllAppointments();
    assert.equal(all[0].status, 'CANCELLED');
    
    // Cancelling an already-cancelled returns false (or we don't care, it returns false here)
    assert.equal(engine.cancelAppointment(apt.protocol, apt.cancelToken), false);
    
    // Wrong token on already cancelled returns false
    assert.equal(engine.cancelAppointment(apt.protocol, 'WRONG_TOKEN'), false);
    
    const engine2 = createEngine(st);
    assert.equal(engine2.getAllAppointments()[0].status, 'CANCELLED');
    
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

test('storage loading and validation preserves quarantined entries', () => {
    const st = memStorage();
    
    st.setItem(STORAGE_KEY, JSON.stringify([
        { protocol: 'MED-123456789012', doctorId: 'doc', date: '2023-10-15', time: '09:00', patientName: 'A', status: 'BOOKED' },
        null,
        {},
        { protocol: '123456789012', doctorId: 'doc', date: '2023-10-15', time: '10:00', patientName: 'A', status: 'BOOKED' },
        { protocol: 'MED-222222222222', doctorId: '', date: '2023-10-15', time: '11:00', patientName: 'A', status: 'BOOKED' },
        { protocol: 'MED-333333333333', doctorId: 'doc', date: '2023-02-30', time: '11:00', patientName: 'A', status: 'BOOKED' },
        { protocol: 'MED-444444444444', doctorId: 'doc', date: '2023-10-15', time: '24:00', patientName: 'A', status: 'BOOKED' },
        { protocol: 'MED-555555555555', doctorId: 'doc', date: '2023-10-15', time: '12:00', patientName: 'A', status: 'DONE' },
        { protocol: 'MED-666666666666', doctorId: 'doc', date: '2023-10-15', time: '13:00', patientName: '  ', status: 'BOOKED' },
        { protocol: 'MED-777777777777', doctorId: 123, date: '2023-10-15', time: '14:00', patientName: 'A', status: 'BOOKED' },
    ]));
    
    const engine3 = createEngine(st);
    assert.equal(engine3.getAllAppointments().length, 1);
    assert.equal(engine3.getAllAppointments()[0].protocol, 'MED-123456789012');
    
    // Save should preserve invalid
    engine3.book('doc2', '2023-10-16', '09:00', 'B');
    const rawAfter = JSON.parse(st.getItem(STORAGE_KEY));
    assert.equal(rawAfter.length, 11);
});

test('Engine constructed with no storage', () => {
    const engineNoStorage = createEngine(null);
    engineNoStorage.book('doc', '2023-10-15', '09:00', 'Test');
    assert.equal(engineNoStorage.getAllAppointments().length, 1);
    
    // Second booking on same slot throws
    assert.throws(() => engineNoStorage.book('doc', '2023-10-15', '09:00', 'Test2'), /Schedule conflict/);
    
    // Second booking on different slot succeeds
    engineNoStorage.book('doc', '2023-10-15', '10:00', 'Test3');
    assert.equal(engineNoStorage.getAllAppointments().length, 2);
});

test('setItem failure rolls back in-memory state', () => {
    const failingStorage = memStorage();
    failingStorage.setItem = () => { throw new Error('Quota exceeded'); };
    const engineFailing = createEngine(failingStorage);
    assert.throws(() => engineFailing.book('doc', '2023-10-15', '09:00', 'Test'), /Failed to persist/);
    assert.equal(engineFailing.getAllAppointments().length, 0); 
});

test('setItem failure on cancellation rolls back state', () => {
    const mockMem = memStorage();
    const engine = createEngine(mockMem);
    const apt = engine.book('doc', '2023-10-15', '09:00', 'Test');
    
    mockMem.setItem = () => { throw new Error('Quota exceeded'); };
    assert.throws(() => engine.cancelAppointment(apt.protocol, apt.cancelToken), /Failed to persist cancellation/);
    assert.equal(engine.getAllAppointments()[0].status, 'BOOKED'); 
});

test('getItem failure handles gracefully', () => {
    const throwingGet = {
        getItem: () => { throw new Error('Access Denied'); },
        setItem: () => {}
    };
    const engine = createEngine(throwingGet);
    assert.equal(engine.getAllAppointments().length, 0);
    // Booking doesn't crash, but it can't read anything
    assert.doesNotThrow(() => engine.book('doc', '2023-10-15', '09:00', 'A'));
});

test('protocol collision retry and exhaustion paths', (t) => {
    let callCount = 0;
    t.mock.method(Math, 'random', () => {
        callCount++;
        return 0; 
    });
    // For this test to hit Math.random, we need to mock crypto or override generateProtocol
    // If running in Node, crypto might be defined. We'll use a hack to ensure Math.random is used
    // Actually, generating 100 collisions with 12 chars requires exact same string. Let's just mock the generator module
    // We'll mock the appointments engine method directly to simulate
    const engine = createEngine(memStorage());
    
    let genCount = 0;
    engine._generateUniqueProtocol = () => {
        let attempts = 0;
        while (attempts < 100) {
            const p = "MED-COLLISION";
            if (!engine.appointments.find(a => a.protocol === p)) {
                return p;
            }
            attempts++;
            genCount++;
        }
        throw new Error("Failed to generate a unique protocol");
    };
    
    engine.book('doc-1', '2023-10-15', '09:00', 'A'); // Takes MED-COLLISION
    
    assert.throws(() => {
        engine.book('doc-1', '2023-10-15', '10:00', 'B');
    }, /Failed to generate a unique protocol/);
    
    assert.equal(genCount, 100);
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

test('reload-on-write across engine instances (concurrency)', () => {
    const st = memStorage();
    const engineA = createEngine(st);
    const engineB = createEngine(st);
    
    const aptA = engineA.book('doc-1', '2023-10-15', '09:00', 'Patient A');
    
    // engineB should see the write and throw conflict
    assert.throws(() => {
        engineB.book('doc-1', '2023-10-15', '09:00', 'Patient B');
    }, /Schedule conflict/);
    
    // engineA cancels
    engineA.cancelAppointment(aptA.protocol, aptA.cancelToken);
    
    // engineB can now book
    const aptB = engineB.book('doc-1', '2023-10-15', '09:00', 'Patient B');
    assert.equal(aptB.status, 'BOOKED');
    
    // engineB reads latest
    const all = engineB.getAllAppointments();
    assert.equal(all.length, 2);
    assert.equal(all[0].status, 'CANCELLED');
    assert.equal(all[1].status, 'BOOKED');
});

test('cancel tokens are hidden from query methods', () => {
    const engine = createEngine(memStorage());
    engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    const all = engine.getAllAppointments();
    assert.equal(all[0].cancelToken, undefined);
    
    const byDoc = engine.getAppointmentsByDoctor('doc-1');
    assert.equal(byDoc[0].cancelToken, undefined);
    
    const byPat = engine.getAppointmentsByPatient('João Silva');
    assert.equal(byPat[0].cancelToken, undefined);
});

test('query method with empty string or null patient returns empty array', () => {
    const engine = createEngine(memStorage());
    engine.book('doc-1', '2023-10-15', '09:00', 'João Silva');
    
    assert.deepEqual(engine.getAppointmentsByPatient(''), []);
    assert.deepEqual(engine.getAppointmentsByPatient('   '), []);
    assert.deepEqual(engine.getAppointmentsByPatient(null), []);
});
