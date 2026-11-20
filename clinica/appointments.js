const STORAGE_KEY = 'clinica.appointments';
const PROTOCOL_PATTERN = /^MED-\d{4,}$/;

function memoryStorage() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, String(value)); },
        removeItem: key => { data.delete(key); }
    };
}

function defaultStorage() {
    try {
        if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) {
        // localStorage may throw when access is denied; fall back to memory.
    }
    return memoryStorage();
}

function nonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

class AppointmentBook {
    constructor(storage, storageKey = STORAGE_KEY) {
        this.storage = storage || defaultStorage();
        this.storageKey = storageKey;
    }

    _load() {
        const raw = this.storage.getItem(this.storageKey);
        if (!raw) return { counter: 0, appointments: [] };
        try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.appointments) && Number.isInteger(parsed.counter)) {
                return parsed;
            }
        } catch (e) {
            // corrupted data: start fresh
        }
        return { counter: 0, appointments: [] };
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
        if (!nonEmptyString(patientName)) {
            throw new Error('Patient name is required.');
        }
        if (!nonEmptyString(datetime) || Number.isNaN(new Date(datetime).getTime())) {
            throw new Error('A valid appointment date/time is required.');
        }

        const doctor = doctorId.trim();
        const slot = new Date(datetime).toISOString();
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
        const time = new Date(datetime).getTime();
        if (Number.isNaN(time)) return false;
        const slot = new Date(time).toISOString();
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
