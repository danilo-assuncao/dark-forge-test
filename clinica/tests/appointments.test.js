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
    for (const [i, descriptor] of [noStorage, throwing].entries()) {
        withLocalStorage(descriptor, () => {
            const t = `2027-0${i + 1}-01T10:00:00Z`;
            const first = new AppointmentBook().book({ doctorId: 'dm', datetime: t, patientName: 'Ana' });
            const second = new AppointmentBook();
            assert.equal(second.isAvailable('dm', t), false);
            assert.throws(() => second.book({ doctorId: 'dm', datetime: t, patientName: 'Bia' }), /already booked/);
            assert.notEqual(second.book({ doctorId: 'dm', datetime: `2027-0${i + 1}-02T10:00:00Z`, patientName: 'Bia' }).protocol, first.protocol);
        });
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
    for (const bad of ['nope', '1', '2026-12-01', '2026-12-01T10:00', '2026-13-45T10:00:00Z', null, 123, new Date(slot)]) {
        assert.throws(() => book.book({ doctorId: 'd1', datetime: bad, patientName: 'Ana' }), /ISO-8601/);
        assert.equal(book.isAvailable('d1', bad), false);
    }
    assert.equal(book.isAvailable('', slot), false);
    assert.equal(book.isAvailable(undefined, slot), false);
    assert.equal(storage.getItem(AppointmentBook.STORAGE_KEY), null);
});

test('trims fields and treats times within the same minute as one slot', () => {
    const book = new AppointmentBook(fakeStorage());
    const a = book.book({ doctorId: ' d1 ', datetime: '2026-12-01T10:00:30Z', patientName: '  Ana  ' });
    assert.equal(a.doctorId, 'd1');
    assert.equal(a.patientName, 'Ana');
    assert.equal(a.datetime, '2026-12-01T10:00:00.000Z');
    assert.throws(() => book.book({ doctorId: 'd1', datetime: '2026-12-01T10:00:59.999Z', patientName: 'Bia' }), /already booked/);
});

test('refuses to overwrite corrupted or wrongly shaped storage', () => {
    const good = { protocol: 'MED-0001', doctorId: 'd1', datetime: slot, patientName: 'Ana' };
    const payloads = [
        '{bad json', 'null', '[]', '{}', '{"counter":"x","appointments":[]}',
        '{"appointments":[]}', '{"counter":-1,"appointments":[]}',
        JSON.stringify({ counter: 1, appointments: [null] }),
        JSON.stringify({ counter: 1, appointments: [{ ...good, protocol: 'XYZ' }] })
    ];
    for (const payload of payloads) {
        const storage = fakeStorage();
        storage.setItem(AppointmentBook.STORAGE_KEY, payload);
        const book = new AppointmentBook(storage);
        assert.throws(() => book.book({ doctorId: 'd2', datetime: slot, patientName: 'Bia' }), /corrupted/);
        assert.throws(() => book.list(), /corrupted/);
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
    const p = book.book({ doctorId: 'd2', datetime: slot, patientName: 'Bia' }).protocol;
    assert.equal(p, 'MED-10000');
    assert.match(p, AppointmentBook.PROTOCOL_PATTERN);
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
