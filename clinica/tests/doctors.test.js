'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { specialties, modalities, insurances, DoctorCatalog } = require('../doctors');

test('DoctorCatalog', async (t) => {
    await t.test('should add a new doctor and retrieve all doctors', () => {
        const catalog = new DoctorCatalog();
        const doc = catalog.addDoctor({
            name: 'Dr. João Silva',
            crm: '123456-SP',
            specialty: specialties.CARDIOLOGY
        });

        assert.ok(doc.id);
        assert.equal(doc.name, 'Dr. João Silva');
        assert.equal(doc.crm, '123456-SP');
        assert.equal(doc.specialty, specialties.CARDIOLOGY);
        assert.deepEqual(doc.modalities, [modalities.IN_PERSON]);
        assert.deepEqual(doc.insurances, [insurances.PARTICULAR]);

        const allDocs = catalog.getAllDoctors();
        assert.equal(allDocs.length, 1);
        assert.equal(allDocs[0].id, doc.id);
    });

    await t.test('should fail when adding a doctor without required fields', () => {
        const catalog = new DoctorCatalog();
        assert.throws(() => {
            catalog.addDoctor({ name: 'No CRM' });
        }, /Name, CRM, and specialty are required/);
    });

    await t.test('should filter doctors by specialty', () => {
        const catalog = new DoctorCatalog();
        catalog.addDoctor({
            name: 'Dr. A',
            crm: '111',
            specialty: specialties.PEDIATRICS
        });
        catalog.addDoctor({
            name: 'Dr. B',
            crm: '222',
            specialty: specialties.DERMATOLOGY
        });
        catalog.addDoctor({
            name: 'Dr. C',
            crm: '333',
            specialty: specialties.PEDIATRICS
        });

        const pediatricians = catalog.getDoctorsBySpecialty(specialties.PEDIATRICS);
        assert.equal(pediatricians.length, 2);
        assert.equal(pediatricians[0].name, 'Dr. A');
        assert.equal(pediatricians[1].name, 'Dr. C');
    });

    await t.test('should filter doctors by modality', () => {
        const catalog = new DoctorCatalog();
        catalog.addDoctor({
            name: 'Dr. Presencial',
            crm: '444',
            specialty: specialties.NEUROLOGY,
            modalities: [modalities.IN_PERSON]
        });
        catalog.addDoctor({
            name: 'Dr. Hibrido',
            crm: '555',
            specialty: specialties.GENERAL_PRACTICE,
            modalities: [modalities.IN_PERSON, modalities.TELECONSULTATION]
        });
        catalog.addDoctor({
            name: 'Dr. Tele',
            crm: '666',
            specialty: specialties.ORTHOPEDICS,
            modalities: [modalities.TELECONSULTATION]
        });

        const teleDocs = catalog.getDoctorsByModality(modalities.TELECONSULTATION);
        assert.equal(teleDocs.length, 2);
        assert.equal(teleDocs[0].name, 'Dr. Hibrido');
        assert.equal(teleDocs[1].name, 'Dr. Tele');
    });

    await t.test('should filter doctors by insurance', () => {
        const catalog = new DoctorCatalog();
        catalog.addDoctor({
            name: 'Dr. Unimed',
            crm: '777',
            specialty: specialties.CARDIOLOGY,
            insurances: [insurances.UNIMED]
        });
        catalog.addDoctor({
            name: 'Dr. SulAmerica',
            crm: '888',
            specialty: specialties.DERMATOLOGY,
            insurances: [insurances.SULAMERICA, insurances.BRADESCO]
        });

        const unimedDocs = catalog.getDoctorsByInsurance(insurances.UNIMED);
        assert.equal(unimedDocs.length, 1);
        assert.equal(unimedDocs[0].name, 'Dr. Unimed');
        
        const bradescoDocs = catalog.getDoctorsByInsurance(insurances.BRADESCO);
        assert.equal(bradescoDocs.length, 1);
        assert.equal(bradescoDocs[0].name, 'Dr. SulAmerica');
    });
});