/*
 * Client-side demo module. Protocols are sequential and the data lives in
 * plaintext localStorage, so this class MUST NOT be used as an authorization
 * boundary or to hold real patient data. A server-side store with access
 * control is required for production use.
 */
const STORAGE_KEY = 'clinica.appointments';
const PROTOCOL_PATTERN = /^MED-\d{4,}$/;
const MAX_DOCTOR_ID_LENGTH = 64;
const MAX_PATIENT_NAME_LENGTH = 100;
// ISO-8601 date-time with an explicit offset (Z or +hh:mm), so the slot never depends on the host timezone.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function memoryStorage() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, String(value)); },
        removeItem: key => { data.delete(key); }
    };
}

// Shared by every instance so the fallback behaves like a real (global) storage.
const sharedMemoryStorage = memoryStorage();

function defaultStorage() {
    try {
        if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) {
        // localStorage may throw when access is denied; fall back to memory.
    }
    return sharedMemoryStorage;
}

function nonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

// Returns the slot (ISO UTC, minute granularity) or null when the input is not acceptable.
function normalizeSlot(datetime) {
    if (typeof datetime !== 'string' || !ISO_WITH_OFFSET.test(datetime.trim())) return null;
    const time = new Date(datetime.trim()).getTime();
    if (Number.isNaN(time)) return null;
    return new Date(Math.floor(time / 60000) * 60000).toISOString();
}

function protocolNumber(protocol) {
    return PROTOCOL_PATTERN.test(protocol) ? parseInt(protocol.slice(4), 10) : NaN;
}

function isValidAppointment(a) {
    return a !== null && typeof a === 'object'
        && typeof a.doctorId === 'string' && typeof a.datetime === 'string'
        && typeof a.patientName === 'string' && typeof a.protocol === 'string'
        && Number.isFinite(protocolNumber(a.protocol));
}

class AppointmentBook {
    constructor(storage, storageKey = STORAGE_KEY) {
        this.storage = storage || defaultStorage();
        this.storageKey = storageKey;
    }

    _load() {
        const raw = this.storage.getItem(this.storageKey);
        if (raw === null || raw === undefined || raw === '') return { counter: 0, appointments: [] };
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            throw new Error('Stored appointments are corrupted and could not be read.');
        }
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.appointments)
            || !Number.isInteger(parsed.counter) || parsed.counter < 0
            || !parsed.appointments.every(isValidAppointment)) {
            throw new Error('Stored appointments are corrupted and could not be read.');
        }
        // Never issue a protocol that already exists, even if the stored counter is stale.
        const highest = parsed.appointments.reduce((m, a) => Math.max(m, protocolNumber(a.protocol)), 0);
        return { counter: Math.max(parsed.counter, highest), appointments: parsed.appointments };
    }

    _save(state) {
        this.storage.setItem(this.storageKey, JSON.stringify(state));
    }

    static formatProtocol(n) {
        return `MED-${String(n).padStart(4, '0')}`;
    }

    book({ doctorId, datetime, patientName } = {}) {
        if (!nonEmptyString(doctorId)) {
            throw new Error('Doctor is required.');
        }
        if (doctorId.trim().length > MAX_DOCTOR_ID_LENGTH) {
            throw new Error(`Doctor id must have at most ${MAX_DOCTOR_ID_LENGTH} characters.`);
        }
        if (!nonEmptyString(patientName)) {
            throw new Error('Patient name is required.');
        }
        if (patientName.trim().length > MAX_PATIENT_NAME_LENGTH) {
            throw new Error(`Patient name must have at most ${MAX_PATIENT_NAME_LENGTH} characters.`);
        }
        const slot = normalizeSlot(datetime);
        if (!slot) {
            throw new Error('A valid ISO-8601 appointment date/time with explicit offset is required.');
        }

        const doctor = doctorId.trim();
        const state = this._load();

        if (state.appointments.some(a => a.doctorId === doctor && a.datetime === slot)) {
            throw new Error('Time slot already booked for this doctor.');
        }

        state.counter += 1;
        const appointment = {
            protocol: AppointmentBook.formatProtocol(state.counter),
            doctorId: doctor,
            datetime: slot,
            patientName: patientName.trim()
        };
        state.appointments.push(appointment);
        this._save(state);
        return { ...appointment };
    }

    isAvailable(doctorId, datetime) {
        if (!nonEmptyString(doctorId)) return false;
        const slot = normalizeSlot(datetime);
        if (!slot) return false;
        return !this._load().appointments.some(a => a.doctorId === doctorId.trim() && a.datetime === slot);
    }

    list() {
        return this._load().appointments.map(a => ({ ...a }));
    }

    findByProtocol(protocol) {
        const found = this._load().appointments.find(a => a.protocol === protocol);
        return found ? { ...found } : null;
    }

    cancel(protocol) {
        const state = this._load();
        const index = state.appointments.findIndex(a => a.protocol === protocol);
        if (index === -1) return false;
        state.appointments.splice(index, 1);
        this._save(state); // counter is kept so protocols are never reused
        return true;
    }
}

AppointmentBook.PROTOCOL_PATTERN = PROTOCOL_PATTERN;
AppointmentBook.STORAGE_KEY = STORAGE_KEY;

module.exports = AppointmentBook;
