'use strict';

const STORAGE_KEY = 'clinica-appointments';

function generateProtocol() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `MED-${code}`;
}

class AppointmentEngine {
    constructor(storage) {
        this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        this.appointments = this._load();
    }

    _load() {
        if (!this.storage) return [];
        try {
            const data = this.storage.getItem(STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            
            return parsed.filter(a => {
                if (!a || typeof a !== 'object') return false;
                if (typeof a.protocol !== 'string' || !a.protocol.startsWith('MED-')) return false;
                if (typeof a.doctorId !== 'string' || !a.doctorId.trim()) return false;
                if (typeof a.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return false;
                if (typeof a.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)) return false;
                if (typeof a.patientName !== 'string' || !a.patientName.trim()) return false;
                if (a.status !== 'BOOKED' && a.status !== 'CANCELLED') return false;
                return true;
            });
        } catch (e) {
            return [];
        }
    }

    _save() {
        if (!this.storage) return;
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.appointments));
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

        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
            throw new Error("Invalid date format. Expected YYYY-MM-DD");
        }
        
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalizedTime)) {
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
        const appointment = {
            protocol,
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
        if (doctorId == null) return [];
        return this.appointments
            .filter(a => a.doctorId === String(doctorId).trim())
            .map(a => ({ ...a }));
    }

    getAppointmentsByPatient(patientName) {
        if (patientName == null) return [];
        const target = String(patientName).trim().toLowerCase();
        return this.appointments
            .filter(a => String(a.patientName || '').toLowerCase() === target)
            .map(a => ({ ...a }));
    }

    getAllAppointments() {
        return this.appointments.map(a => ({ ...a }));
    }
    
    cancelAppointment(protocol, patientName) {
        this.appointments = this._load();

        if (!patientName) {
            throw new Error("Patient name is required to cancel an appointment.");
        }

        const index = this.appointments.findIndex(a => a.protocol === protocol);
        if (index === -1) return false;

        const apt = this.appointments[index];

        if (String(apt.patientName).trim().toLowerCase() !== String(patientName).trim().toLowerCase()) {
            throw new Error("Authorization failed: Patient name does not match.");
        }
        
        if (apt.status === 'CANCELLED') {
            return true;
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
        generateProtocol
    };
}
