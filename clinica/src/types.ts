export type Specialty = 'cardiologia' | 'dermatologia' | 'ortopedia' | 'clinica-geral'

export type TriagePriority = 'verde' | 'amarelo' | 'vermelho'

export interface DoctorProfile {
  id: string
  name: string
  specialty: Specialty
  crm: string
  active: boolean
}

export interface LabExam {
  id: string
  patientId: string
  doctorId: string
  examName: string
  date: string
  result: string
  status: 'pending' | 'completed' | 'cancelled'
}
