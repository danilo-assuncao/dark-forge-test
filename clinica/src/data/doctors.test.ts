import { describe, it, expect } from 'vitest'
import { listDoctors, filterDoctorsBySpecialty, getDoctorById } from './doctors'

describe('Doctors Data', () => {
  it('should list all doctors', () => {
    const doctors = listDoctors()
    expect(doctors.length).toBeGreaterThan(0)
  })

  it('should filter doctors by specialty', () => {
    const cardiologists = filterDoctorsBySpecialty('cardiologia')
    expect(cardiologists.every(d => d.specialty === 'cardiologia')).toBe(true)
    expect(cardiologists.length).toBe(1)
  })

  it('should return doctor by id', () => {
    const doctor = getDoctorById('1')
    expect(doctor).toBeDefined()
    expect(doctor?.id).toBe('1')
  })

  it('should return undefined for non-existent doctor', () => {
    const doctor = getDoctorById('non-existent-id')
    expect(doctor).toBeUndefined()
  })
})
