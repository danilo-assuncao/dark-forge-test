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
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    _save() {
        if (!this.storage) return;
        try {
            this.storage.setItem(STORAGE_KEY, JSON.stringify(this.appointments));
        } catch (e) {
            // ignore
        }
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
        this._save();

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
        return this.appointments
            .filter(a => a.patientName.toLowerCase() === String(patientName).trim().toLowerCase())
            .map(a => ({ ...a }));
    }

    getAllAppointments() {
        return this.appointments.map(a => ({ ...a }));
    }
    
    cancelAppointment(protocol) {
        const index = this.appointments.findIndex(a => a.protocol === protocol);
        if (index === -1) return false;
        
        if (this.appointments[index].status === 'CANCELLED') {
            return true;
        }

        this.appointments[index].status = 'CANCELLED';
        this._save();
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
