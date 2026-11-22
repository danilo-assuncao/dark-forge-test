import { DoctorProfile, Specialty } from '../types'

const doctors: DoctorProfile[] = [
  {
    id: '1',
    name: 'Dr. João Silva',
    specialty: 'cardiologia',
    crm: '12345-SP',
    active: true
  },
  {
    id: '2',
    name: 'Dra. Maria Souza',
    specialty: 'dermatologia',
    crm: '54321-RJ',
    active: true
  },
  {
    id: '3',
    name: 'Dr. Pedro Santos',
    specialty: 'ortopedia',
    crm: '98765-MG',
    active: false
  },
  {
    id: '4',
    name: 'Dra. Ana Costa',
    specialty: 'clinica-geral',
    crm: '11111-PR',
    active: true
  }
]

export const listDoctors = (): DoctorProfile[] => {
  return doctors
}

export const filterDoctorsBySpecialty = (spec: Specialty): DoctorProfile[] => {
  return doctors.filter((doctor) => doctor.specialty === spec)
}

export const getDoctorById = (id: string): DoctorProfile | undefined => {
  return doctors.find((doctor) => doctor.id === id)
}
