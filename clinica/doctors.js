(function (global) {
'use strict';
const isNode = typeof module !== 'undefined' && module.exports;
const cryptoApi = isNode ? require('crypto') : global.crypto;

const specialties = {
    CARDIOLOGY: 'Cardiologia',
    DERMATOLOGY: 'Dermatologia',
    PEDIATRICS: 'Pediatria',
    NEUROLOGY: 'Neurologia',
    GENERAL_PRACTICE: 'Clínica Geral',
    ORTHOPEDICS: 'Ortopedia'
};

const modalities = {
    IN_PERSON: 'Presencial',
    TELECONSULTATION: 'Teleconsulta'
};

const insurances = {
    BRADESCO: 'Bradesco Saúde',
    SULAMERICA: 'SulAmérica',
    AMIL: 'Amil',
    UNIMED: 'Unimed',
    PARTICULAR: 'Particular'
};

class DoctorCatalog {
    constructor() {
        this.doctors = [];
    }

    addDoctor(doctor) {
        if (!doctor) {
            throw new Error("Doctor object is required.");
        }

        if (typeof doctor.name !== 'string' || doctor.name.trim() === '' || 
            typeof doctor.crm !== 'string' || doctor.crm.trim() === '' || 
            !Object.values(specialties).includes(doctor.specialty)) {
            throw new Error("Valid Name, CRM, and specialty are required.");
        }

        const normalizedCrm = doctor.crm.trim();
        if (this.doctors.some(d => d.crm === normalizedCrm)) {
            throw new Error("A doctor with this CRM already exists.");
        }

        const mods = Array.isArray(doctor.modalities) && doctor.modalities.length > 0 
            ? doctor.modalities 
            : [modalities.IN_PERSON];
        
        if (!mods.every(m => Object.values(modalities).includes(m))) {
             throw new Error("Invalid modalities.");
        }

        const ins = Array.isArray(doctor.insurances) && doctor.insurances.length > 0
            ? doctor.insurances
            : [insurances.PARTICULAR];

        if (!ins.every(i => Object.values(insurances).includes(i))) {
             throw new Error("Invalid insurances.");
        }

        const newDoctor = {
            id: cryptoApi.randomUUID(),
            name: doctor.name.trim(),
            crm: normalizedCrm,
            specialty: doctor.specialty,
            modalities: [...mods],
            insurances: [...ins]
        };

        this.doctors.push(newDoctor);
        // Retornar um clone profundo ou pelo menos raso (evitar mutação do chamador)
        return { ...newDoctor, modalities: [...newDoctor.modalities], insurances: [...newDoctor.insurances] };
    }

    getAllDoctors() {
        return this.doctors.map(d => ({ ...d, modalities: [...d.modalities], insurances: [...d.insurances] }));
    }

    getDoctorsBySpecialty(specialty) {
        return this.doctors
            .filter(doc => doc.specialty === specialty)
            .map(d => ({ ...d, modalities: [...d.modalities], insurances: [...d.insurances] }));
    }

    getDoctorsByModality(modality) {
        return this.doctors
            .filter(doc => doc.modalities.includes(modality))
            .map(d => ({ ...d, modalities: [...d.modalities], insurances: [...d.insurances] }));
    }

    getDoctorsByInsurance(insurance) {
        return this.doctors
            .filter(doc => doc.insurances.includes(insurance))
            .map(d => ({ ...d, modalities: [...d.modalities], insurances: [...d.insurances] }));
    }
}

const api = { specialties, modalities, insurances, DoctorCatalog };
if (isNode) { module.exports = api; } else { global.ClinicaDoctors = api; }
})(typeof window !== 'undefined' ? window : this);
