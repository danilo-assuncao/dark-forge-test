'use strict';

// WARNING: localStorage stores PII in plaintext. Query methods do not enforce authorization.
const STORAGE_KEY = 'clinica-appointments';

function generateProtocol() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let code = '';
    const cryptoObj = typeof crypto !== 'undefined' ? crypto : (typeof require !== 'undefined' ? require('crypto') : null);
    
    if (cryptoObj && cryptoObj.getRandomValues) {
        const arr = new Uint8Array(12);
        cryptoObj.getRandomValues(arr);
        for (let i = 0; i < 12; i++) {
            code += chars[arr[i] % chars.length];
        }
    } else if (cryptoObj && cryptoObj.randomBytes) {
        const arr = cryptoObj.randomBytes(12);
        for (let i = 0; i < 12; i++) {
            code += chars[arr[i] % chars.length];
        }
    } else {
        for (let i = 0; i < 12; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    return `MED-${code}`;
}

function generateCancelToken() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let code = '';
    const cryptoObj = typeof crypto !== 'undefined' ? crypto : (typeof require !== 'undefined' ? require('crypto') : null);
    
    if (cryptoObj && cryptoObj.getRandomValues) {
        const arr = new Uint8Array(16);
        cryptoObj.getRandomValues(arr);
        for (let i = 0; i < 16; i++) {
            code += chars[arr[i] % chars.length];
        }
    } else if (cryptoObj && cryptoObj.randomBytes) {
        const arr = cryptoObj.randomBytes(16);
        for (let i = 0; i < 16; i++) {
            code += chars[arr[i] % chars.length];
        }
    } else {
        for (let i = 0; i < 16; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    return code;
}

function isValidCalendarDate(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const [y, m, day] = d.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === day;
}

function isValidTime(t) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

class AppointmentEngine {
    constructor(storage) {
        this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        this.quarantined = [];
        this.appointments = this._load(true);
    }

    _load(isInit = false) {
        if (!this.storage) {
            return isInit ? [] : (this.appointments || []);
        }
        try {
            const data = this.storage.getItem(STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            
            const valid = [];
            const invalid = [];
            const seenProtocols = new Set();
            
            for (const a of parsed) {
                let isValid = true;
                if (!a || typeof a !== 'object') isValid = false;
                else if (typeof a.protocol !== 'string' || !a.protocol.startsWith('MED-')) isValid = false;
                else if (typeof a.doctorId !== 'string' || !a.doctorId.trim()) isValid = false;
                else if (typeof a.date !== 'string' || !isValidCalendarDate(a.date)) isValid = false;
                else if (typeof a.time !== 'string' || !isValidTime(a.time)) isValid = false;
                else if (typeof a.patientName !== 'string' || !a.patientName.trim() || a.patientName.trim().length > 200) isValid = false;
                else if (a.status !== 'BOOKED' && a.status !== 'CANCELLED') isValid = false;
                else if (seenProtocols.has(a.protocol)) isValid = false;
                
                if (isValid) {
                    seenProtocols.add(a.protocol);
                    valid.push(a);
                } else {
                    invalid.push(a);
                }
            }
            this.quarantined = invalid;
            return valid;
        } catch (e) {
            return [];
        }
    }

    _save() {
        if (!this.storage) return;
        const allData = [...this.appointments, ...this.quarantined];
        this.storage.setItem(STORAGE_KEY, JSON.stringify(allData));
    }
    
    _generateUniqueProtocol() {
        let attempts = 0;
        while (attempts < 100) {
            const p = generateProtocol();
            if (!this.appointments.find(a => a.protocol === p)) {
                return p;
            }
            attempts++;
        }
        throw new Error("Failed to generate a unique protocol");
    }

    book(doctorId, date, time, patientName) {
        this.appointments = this._load();

        if (doctorId == null || date == null || time == null || patientName == null) {
            throw new Error("Missing required fields: doctorId, date, time, patientName");
        }

        const normalizedDoctorId = String(doctorId).trim();
        const normalizedDate = String(date).trim();
        const normalizedTime = String(time).trim();
        const normalizedPatient = String(patientName).trim();

        if (!normalizedDoctorId || !normalizedDate || !normalizedTime || !normalizedPatient) {
             throw new Error("Fields cannot be empty");
        }
        
        if (normalizedPatient.length > 200) {
            throw new Error("Patient name is too long");
        }

        if (!isValidCalendarDate(normalizedDate)) {
            throw new Error("Invalid date format. Expected YYYY-MM-DD");
        }
        
        if (!isValidTime(normalizedTime)) {
            throw new Error("Invalid time format. Expected HH:MM");
        }

        const conflict = this.appointments.find(a => 
            a.doctorId === normalizedDoctorId && 
            a.date === normalizedDate && 
            a.time === normalizedTime &&
            a.status !== 'CANCELLED'
        );

        if (conflict) {
            throw new Error("Schedule conflict: The doctor is already booked for this date and time.");
        }

        const protocol = this._generateUniqueProtocol();
        const cancelToken = generateCancelToken();
        const appointment = {
            protocol,
            cancelToken,
            doctorId: normalizedDoctorId,
            date: normalizedDate,
            time: normalizedTime,
            patientName: normalizedPatient,
            status: 'BOOKED',
            createdAt: new Date().toISOString()
        };

        this.appointments.push(appointment);
        try {
            this._save();
        } catch (e) {
            this.appointments.pop();
            throw new Error("Failed to persist appointment: " + e.message);
        }

        return { ...appointment };
    }

    getAppointmentsByDoctor(doctorId) {
        this.appointments = this._load();
        if (doctorId == null) return [];
        return this.appointments
            .filter(a => a.doctorId === String(doctorId).trim())
            .map(a => {
                const copy = { ...a };
                delete copy.cancelToken; // Do not expose token on query
                return copy;
            });
    }

    getAppointmentsByPatient(patientName) {
        this.appointments = this._load();
        if (patientName == null || !String(patientName).trim()) return [];
        const target = String(patientName).trim().toLowerCase();
        return this.appointments
            .filter(a => String(a.patientName || '').toLowerCase() === target)
            .map(a => {
                const copy = { ...a };
                delete copy.cancelToken;
                return copy;
            });
    }

    getAllAppointments() {
        this.appointments = this._load();
        return this.appointments.map(a => {
            const copy = { ...a };
            delete copy.cancelToken;
            return copy;
        });
    }
    
    // Constant time string comparison
    _constantTimeEqual(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') return false;
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }

    cancelAppointment(protocol, cancelToken) {
        this.appointments = this._load();

        if (!cancelToken || typeof cancelToken !== 'string') {
            return false;
        }

        const index = this.appointments.findIndex(a => a.protocol === protocol);
        if (index === -1) return false;

        const apt = this.appointments[index];

        if (!apt.cancelToken || !this._constantTimeEqual(apt.cancelToken, cancelToken)) {
            return false; // same response as not found
        }
        
        if (apt.status === 'CANCELLED') {
            return false;
        }

        apt.status = 'CANCELLED';
        
        try {
            this._save();
        } catch (e) {
            apt.status = 'BOOKED';
            throw new Error("Failed to persist cancellation: " + e.message);
        }

        return true;
    }
}

function createEngine(storage) {
    return new AppointmentEngine(storage);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_KEY,
        AppointmentEngine,
        createEngine,
        generateProtocol,
        generateCancelToken
    };
}
