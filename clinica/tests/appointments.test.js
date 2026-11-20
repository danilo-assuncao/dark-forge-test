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
    assert.match(a.protocol, /^MED-\d{4}$/);
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

test('uses global localStorage when available', () => {
    const storage = fakeStorage();
    globalThis.localStorage = storage;
    try {
        new AppointmentBook().book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' });
        assert.ok(storage.data[AppointmentBook.STORAGE_KEY]);
    } finally {
        delete globalThis.localStorage;
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

test('validates input and tolerates corrupted storage', () => {
    const storage = fakeStorage();
    const book = new AppointmentBook(storage);
    assert.throws(() => book.book({}), /Doctor/);
    assert.throws(() => book.book({ doctorId: 'd1', datetime: slot }), /Patient/);
    assert.throws(() => book.book({ doctorId: 'd1', datetime: 'nope', patientName: 'Ana' }), /date/);
    storage.setItem(AppointmentBook.STORAGE_KEY, '{bad json');
    assert.equal(book.book({ doctorId: 'd1', datetime: slot, patientName: 'Ana' }).protocol, 'MED-0001');
});
