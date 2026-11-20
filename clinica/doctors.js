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
        if (!doctor.name || !doctor.crm || !doctor.specialty) {
            throw new Error("Name, CRM, and specialty are required.");
        }

        const newDoctor = {
            id: doctor.id || Date.now().toString(),
            name: doctor.name,
            crm: doctor.crm,
            specialty: doctor.specialty,
            modalities: doctor.modalities || [modalities.IN_PERSON],
            insurances: doctor.insurances || [insurances.PARTICULAR]
        };

        this.doctors.push(newDoctor);
        return newDoctor;
    }

    getAllDoctors() {
        return this.doctors;
    }

    getDoctorsBySpecialty(specialty) {
        return this.doctors.filter(doc => doc.specialty === specialty);
    }

    getDoctorsByModality(modality) {
        return this.doctors.filter(doc => doc.modalities.includes(modality));
    }

    getDoctorsByInsurance(insurance) {
        return this.doctors.filter(doc => doc.insurances.includes(insurance));
    }
}

module.exports = {
    specialties,
    modalities,
    insurances,
    DoctorCatalog
};