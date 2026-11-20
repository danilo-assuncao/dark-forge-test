'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AppointmentBook = require('../appointments.js');

function fakeStorage() {
    const data = {};
    return {
        data,
        getItem: k => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: k => { delete data[k]; }
    };
}

const slot = '2026-12-01T10:00:00.000Z';

test('books an appointment and generates a MED-XXXX protocol', () => {
    const book = new AppointmentBook(fakeStorage());
    const a = book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    assert.equal(a.protocol, 'MED-0001');
    assert.match(a.protocol, AppointmentBook.PROTOCOL_PATTERN);
    const b = book.book({ doctorId: 'd1', datetime: '2026-12-01T11:00:00.000Z', patientName: 'Bia' });
    assert.equal(b.protocol, 'MED-0002');
});

test('blocks duplicate booking for same doctor and time', () => {
    const book = new AppointmentBook(fakeStorage());
    book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    assert.throws(() => book.book({ doctorId: ' d1 ', datetime: '2026-12-01T07:00:00-03:00', patientName: 'Bia' }), /already booked/);
    assert.equal(book.list().length, 1);
    assert.equal(book.isAvailable('d1', slot), false);
});

test('allows same time with another doctor', () => {
    const book = new AppointmentBook(fakeStorage());
    book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    assert.doesNotThrow(() => book.book({ doctorId: 'd2', datetime: slot, patientName: 'Bia' }));
    assert.equal(book.isAvailable('d3', slot), true);
});

test('persists appointments across instances via storage', () => {
    const storage = fakeStorage();
    new AppointmentBook(storage).book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    const other = new AppointmentBook(storage);
    assert.equal(other.list().length, 1);
    assert.throws(() => other.book({ doctorId: 'd1', datetime: slot, patientName: 'Bia' }), /already booked/);
    assert.equal(other.book({ doctorId: 'd1', datetime: '2026-12-02T10:00:00Z', patientName: 'Bia' }).protocol, 'MED-0002');
});

function withLocalStorage(descriptor, fn) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
    try {
        fn();
    } finally {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else delete globalThis.localStorage;
    }
}

test('uses global localStorage when available', () => {
    const storage = fakeStorage();
    withLocalStorage({ value: storage, writable: true }, () => {
        new AppointmentBook().book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
        assert.ok(storage.data[AppointmentBook.STORAGE_KEY]);
    });
});

test('falls back to shared in-memory storage without localStorage or when it throws', () => {
    const noStorage = { get: () => undefined };
    const throwing = { get: () => { throw new Error('denied'); } };
    try {
        for (const [i, descriptor] of [noStorage, throwing].entries()) {
            withLocalStorage(descriptor, () => {
                AppointmentBook.sharedMemoryStorage.clear();
                const t = `2027-0${i + 1}-01T10:00:00Z`;
                const first = new AppointmentBook().book({ doctorId: 'dm', datetime: t, patientName: 'Ana' });
                assert.equal(first.protocol, 'MED-0001');
                const second = new AppointmentBook();
                assert.equal(second.isAvailable('dm', t), false);
                assert.throws(() => second.book({ doctorId: 'dm', datetime: t, patientName: 'Bia' }), /already booked/);
                const secondBooking = second.book({ doctorId: 'dm', datetime: `2027-0${i + 1}-02T10:00:00Z`, patientName: 'Bia' });
                assert.equal(secondBooking.protocol, 'MED-0002');
            });
        }
    } finally {
        AppointmentBook.sharedMemoryStorage.clear();
    }
});

test('protocols are not reused after cancel; findByProtocol works', () => {
    const book = new AppointmentBook(fakeStorage());
    const a = book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    assert.equal(book.findByProtocol(a.protocol).patientName, 'Ana');
    assert.equal(book.cancel(a.protocol), true);
    assert.equal(book.cancel(a.protocol), false);
    assert.equal(book.isAvailable('d1', slot), true);
    assert.equal(book.book({ doctorId: 'd1', datetime: slot, patientName: 'Bia' }).protocol, 'MED-0002');
});

test('validates input boundaries and accepts values at limits', () => {
    const storage = fakeStorage();
    const book = new AppointmentBook(storage);
    const validDoctor = 'x'.repeat(64);
    const validPatient = 'y'.repeat(100);
    const a = book.book({ doctorId: validDoctor, datetime: slot, patientName: validPatient });
    assert.equal(a.doctorId, validDoctor);
    assert.equal(a.patientName, validPatient);
    
    // Trimmed limits
    const paddedDoctor = '  ' + 'z'.repeat(64) + '  ';
    const paddedPatient = '  ' + 'w'.repeat(100) + '  ';
    const b = book.book({ doctorId: paddedDoctor, datetime: '2026-12-02T10:00:00Z', patientName: paddedPatient });
    assert.equal(b.doctorId, 'z'.repeat(64));
    assert.equal(b.patientName, 'w'.repeat(100));
});

test('validates input and leaves storage unchanged on failure', () => {
    const storage = fakeStorage();
    const book = new AppointmentBook(storage);
    assert.throws(() => book.book({}), /Doctor/);
    assert.throws(() => book.book({ doctorId: '   ', datetime: slot, patientName: 'Ana' }), /Doctor/);
    assert.throws(() => book.book({ doctorId: 5, datetime: slot, patientName: 'Ana' }), /Doctor/);
    assert.throws(() => book.book({ doctorId: 'd1', datetime: slot }), /Patient/);
    assert.throws(() => book.book({ doctorId: 'd1', datetime: slot, patientName: '  ' }), /Patient/);
    assert.throws(() => book.book({ doctorId: 'd1', datetime: slot, patientName: 'x'.repeat(101) }), /at most/);
    assert.throws(() => book.book({ doctorId: 'x'.repeat(65), datetime: slot, patientName: 'Ana' }), /at most/);
    for (const bad of ['nope', '1', '2026-12-01', '2026-12-01T10:00', '2026-13-45T10:00:00Z', '2026-02-30T10:00:00Z', '2026-02-31T10:00:00Z', '2026-12-01T24:00:00Z', '2026-02-29T10:00:00Z', '2100-02-29T10:00:00Z', '2026-04-31T10:00:00Z', '2026-00-10T10:00:00Z', '2026-01-00T10:00:00Z', '2026-12-01T10:60:00Z', '2026-12-01T10:00:00+25:00', '2026-12-01t10:00:00z', '2026-12-01 10:00:00Z', '9999-12-31T23:30:00-03:00', '0000-01-01T00:00:00+01:00', null, 123, new Date(slot)]) {
        assert.throws(() => book.book({ doctorId: 'd1', datetime: bad, patientName: 'Ana' }), /ISO-8601/);
        assert.equal(book.isAvailable('d1', bad), false);
    }
    assert.equal(book.isAvailable('', slot), false);
    assert.equal(book.isAvailable(undefined, slot), false);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), null);
    
    // accepts whitespace around valid slot
    assert.doesNotThrow(() => book.book({ doctorId: 'd1', datetime: `  ${slot}  `, patientName: 'Ana' }));
});

test('handles correct calendar edge cases (leap years)', () => {
    const book = new AppointmentBook(fakeStorage());
    assert.doesNotThrow(() => book.book({ doctorId: 'd1', datetime: '2028-02-29T10:00:00Z', patientName: 'Ana' }));
    assert.doesNotThrow(() => book.book({ doctorId: 'd2', datetime: '2000-02-29T10:00:00Z', patientName: 'Ana' }));
});

test('trims fields and treats times within the same minute as one slot', () => {
    const book = new AppointmentBook(fakeStorage());
    const a = book.book({ doctorId: ' d1 ', datetime: '2026-12-01T10:00:30Z', patientName: '  Ana  ' });
    assert.equal(a.doctorId, 'd1');
    assert.equal(a.patientName, 'Ana');
    assert.equal(a.datetime, '2026-12-01T10:00:00.000Z');
    assert.throws(() => book.book({ doctorId: 'd1', datetime: '2026-12-01T10:00:59.999Z', patientName: 'Bia' }), /already booked/);
});

test('normalizes +hh:mm offset to UTC ISO string', () => {
    const book = new AppointmentBook(fakeStorage());
    const a = book.book({ doctorId: 'd1', datetime: '2026-12-01T07:00:00-03:00', patientName: 'Ana' });
    assert.equal(a.datetime, '2026-12-01T10:00:00.000Z');
});

test('supports custom storageKey separating instances on the same storage', () => {
    const storage = fakeStorage();
    const book1 = new AppointmentBook(storage, 'key1');
    const book2 = new AppointmentBook(storage, 'key2');
    book1.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    assert.doesNotThrow(() => book2.book({ doctorId: 'd1', datetime: slot, patientName: 'Bia' }));
    assert.equal(book1.list()[0].patientName, 'Ana');
    assert.equal(book2.list()[0].patientName, 'Bia');
});

test('refuses to overwrite corrupted or wrongly shaped storage', () => {
    const good = { protocol: 'MED-0001', doctorId: 'd1', datetime: slot, patientName: 'Ana' };
    const payloads = [
        '{bad json', 'null', '[]', '{}', '{"counter":"x","appointments":[]}',
        '{"appointments":[]}', '{"counter":-1,"appointments":[]}',
        JSON.stringify({ counter: 1, appointments: [null] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, protocol: 'XYZ' }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, protocol: 'MED-12' }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, datetime: 123 }] }),
        JSON.stringify({ counter: 2, appointments: [good, { ...good, doctorId: 'd2' }] }),
        JSON.stringify({ counter: 2, appointments: [good, { ...good, protocol: 'MED-0002' }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, protocol: 'MED-99999999999999999999' }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, doctorId: 123 }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, patientName: null }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, doctorId: ' d1 ' }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, doctorId: '' }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, patientName: 'x'.repeat(101) }] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, datetime: '2026-12-01T10:00:00Z' }] }),
        JSON.stringify({ counter: Number.MAX_SAFE_INTEGER + 1, appointments: [] })
    ];
    for (const payload of payloads) {
        const storage = fakeStorage();
        storage.setItem(AppointmentBook.STORAGE_KEY, payload);
        const book = new AppointmentBook(storage);
        assert.throws(() => book.book({ doctorId: 'd2', datetime: slot, patientName: 'Bia' }), /corrupted/);
        assert.throws(() => book.list(), /corrupted/);
        assert.throws(() => book.isAvailable('d1', slot), /corrupted/);
        assert.throws(() => book.findByProtocol('MED-0001'), /corrupted/);
        assert.throws(() => book.cancel('MED-0001'), /corrupted/);
        assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), payload);
    }
});

test('counter never falls below the highest stored protocol and supports >9999', () => {
    const storage = fakeStorage();
    const seed = (counter, protocol) => storage.setItem(AppointmentBook.STORAGE_KEY, JSON.stringify({
        counter, appointments: [{ protocol, doctorId: 'd1', datetime: slot, patientName: 'Ana' }]
    }));
    seed(0, 'MED-0005');
    const book = new AppointmentBook(storage);
    assert.equal(book.book({ doctorId: 'd2', datetime: slot, patientName: 'Bia' }).protocol, 'MED-0006');
    seed(9999, 'MED-9999');
    const p = book.book({ doctorId: 'd2', datetime: '2026-12-02T10:00:00Z', patientName: 'Bia' }).protocol;
    assert.equal(p, 'MED-10000');
    assert.match(p, AppointmentBook.PROTOCOL_PATTERN);

    // Max safe integer counter branch
    seed(Number.MAX_SAFE_INTEGER, 'MED-99999');
    const stateBefore = storage.getItem(AppointmentBook.STORAGE_KEY);
    assert.throws(() => book.book({ doctorId: 'd3', datetime: '2026-12-03T10:00:00Z', patientName: 'Carla' }), /Maximum counter reached/);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), stateBefore);
});

test('returns defensive copies and null for unknown protocols', () => {
    const book = new AppointmentBook(fakeStorage());
    const a = book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    a.patientName = 'Hacked';
    book.list()[0].patientName = 'Hacked';
    book.findByProtocol('MED-0001').patientName = 'Hacked';
    assert.equal(book.findByProtocol('MED-0001').patientName, 'Ana');
    assert.equal(book.list()[0].patientName, 'Ana');
    assert.equal(book.findByProtocol('MED-9999'), null);
});

test('enforces quota on maximum appointments', () => {
    const storage = fakeStorage();
    const book = new AppointmentBook(storage);
    // Simulate having 9999 appointments
    const state = { counter: 9999, appointments: [] };
    for (let i = 0; i < 9999; i++) {
        const dt = new Date(Date.UTC(2030, 0, 1, 0, i)).toISOString();
        state.appointments.push({ protocol: AppointmentBook.formatProtocol(i + 1), doctorId: 'd1', datetime: dt, patientName: 'A' });
    }
    storage.setItem(AppointmentBook.STORAGE_KEY, JSON.stringify(state));
    const dt10000 = new Date(Date.UTC(2030, 0, 1, 0, 9999)).toISOString();
    assert.equal(book.book({ doctorId: 'd1', datetime: dt10000, patientName: 'B' }).protocol, 'MED-10000');
    
    // Now it has 10000, should fail and leave storage unchanged
    const storedBeforeLimit = storage.getItem(AppointmentBook.STORAGE_KEY);
    assert.throws(() => book.book({ doctorId: 'd1', datetime: '2030-01-02T10:00:00Z', patientName: 'B' }), /Maximum number/);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), storedBeforeLimit);
});

test('handles QuotaExceededError when saving', () => {
    const storage = fakeStorage();
    const book = new AppointmentBook(storage);
    
    // Setup a valid state first
    book.book({ doctorId: 'd2', datetime: '2026-12-02T10:00:00Z', patientName: 'Ana' });
    const goodState = storage.getItem(AppointmentBook.STORAGE_KEY);
    
    const originalSetItem = storage.setItem;
    storage.setItem = () => {
        const err = new Error('Disk full');
        err.name = 'QuotaExceededError';
        throw err;
    };
    
    assert.throws(() => book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' }), /Storage quota exceeded/);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), goodState);
    
    // Also tests cancel()
    assert.throws(() => book.cancel('MED-0001'), /Storage quota exceeded/);
    assert.equal(book.findByProtocol('MED-0001').patientName, 'Ana');
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), goodState);

    storage.setItem = () => {
        const err = new Error('Disk full');
        err.name = 'NS_ERROR_DOM_QUOTA_REACHED';
        throw err;
    };
    
    assert.throws(() => book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' }), /Storage quota exceeded/);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), goodState);

    const genericError = new Error('Other storage error');
    storage.setItem = () => { throw genericError; };
    
    let caught;
    try {
        book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
    } catch (e) {
        caught = e;
    }
    assert.match(caught.message, /Storage operation failed/);
    assert.equal(caught.cause, genericError);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), goodState);

    // After storage recovers, book should succeed
    storage.setItem = originalSetItem;
    assert.equal(book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' }).protocol, 'MED-0002');
});
