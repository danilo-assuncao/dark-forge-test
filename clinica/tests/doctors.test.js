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
        
        // Missing name
        assert.throws(() => {
            catalog.addDoctor({ crm: '111', specialty: specialties.CARDIOLOGY });
        }, /Valid Name, CRM, and specialty are required/);
        assert.equal(catalog.getAllDoctors().length, 0);

        // Missing CRM
        assert.throws(() => {
            catalog.addDoctor({ name: 'Dr. X', specialty: specialties.CARDIOLOGY });
        }, /Valid Name, CRM, and specialty are required/);
        assert.equal(catalog.getAllDoctors().length, 0);

        // Missing specialty
        assert.throws(() => {
            catalog.addDoctor({ name: 'Dr. X', crm: '111' });
        }, /Valid Name, CRM, and specialty are required/);
        assert.equal(catalog.getAllDoctors().length, 0);

        // Null doctor argument
        assert.throws(() => {
            catalog.addDoctor(null);
        }, /Doctor object is required/);
        assert.equal(catalog.getAllDoctors().length, 0);

        // Empty string
        assert.throws(() => {
            catalog.addDoctor({ name: '   ', crm: '111', specialty: specialties.CARDIOLOGY });
        }, /Valid Name, CRM, and specialty are required/);
        assert.equal(catalog.getAllDoctors().length, 0);
    });

    await t.test('should fail when adding duplicate CRM', () => {
        const catalog = new DoctorCatalog();
        catalog.addDoctor({ name: 'Dr. X', crm: '111', specialty: specialties.CARDIOLOGY });
        assert.throws(() => {
            catalog.addDoctor({ name: 'Dr. Y', crm: '111', specialty: specialties.PEDIATRICS });
        }, /A doctor with this CRM already exists/);
    });

    await t.test('should validate specialty enum values', () => {
        const catalog = new DoctorCatalog();
        assert.throws(() => {
            catalog.addDoctor({ name: 'Dr. X', crm: '111', specialty: 'Unknown Specialty' });
        }, /Valid Name, CRM, and specialty are required/);
        assert.equal(catalog.getAllDoctors().length, 0);
    });

    await t.test('should validate modalities enum values', () => {
        const catalog = new DoctorCatalog();
        assert.throws(() => {
            catalog.addDoctor({ name: 'Dr. X', crm: '111', specialty: specialties.CARDIOLOGY, modalities: ['Unknown'] });
        }, /Invalid modalities/);
        assert.equal(catalog.getAllDoctors().length, 0);
    });

    await t.test('should validate insurances enum values', () => {
        const catalog = new DoctorCatalog();
        assert.throws(() => {
            catalog.addDoctor({ name: 'Dr. X', crm: '111', specialty: specialties.CARDIOLOGY, insurances: ['Unknown'] });
        }, /Invalid insurances/);
        assert.equal(catalog.getAllDoctors().length, 0);
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

    await t.test('should return empty array for non-matching filter', () => {
        const catalog = new DoctorCatalog();
        catalog.addDoctor({ name: 'Dr. A', crm: '111', specialty: specialties.PEDIATRICS });
        const dermatologists = catalog.getDoctorsBySpecialty(specialties.DERMATOLOGY);
        assert.equal(dermatologists.length, 0);
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

    await t.test('should generate unique UUIDs and reject caller id', () => {
        const catalog = new DoctorCatalog();
        const doc1 = catalog.addDoctor({ name: 'A', crm: '1', specialty: specialties.CARDIOLOGY, id: '123' });
        const doc2 = catalog.addDoctor({ name: 'B', crm: '2', specialty: specialties.CARDIOLOGY });
        const doc3 = catalog.addDoctor({ name: 'C', crm: '3', specialty: specialties.CARDIOLOGY });
        
        assert.notEqual(doc1.id, '123');
        assert.notEqual(doc1.id, doc2.id);
        assert.notEqual(doc2.id, doc3.id);
        assert.notEqual(doc1.id, doc3.id);
        
        // Ensure format is somewhat UUID-like (simple length check)
        assert.equal(doc1.id.length, 36); 
    });

    await t.test('should not leak references when reading doctors', () => {
        const catalog = new DoctorCatalog();
        catalog.addDoctor({ name: 'A', crm: '1', specialty: specialties.CARDIOLOGY });
        
        const docs = catalog.getAllDoctors();
        docs[0].name = 'Hacked';
        docs[0].modalities.push(modalities.TELECONSULTATION);
        
        const reFetched = catalog.getAllDoctors();
        assert.equal(reFetched[0].name, 'A'); // unchanged
        assert.equal(reFetched[0].modalities.length, 1); // unchanged
    });
});