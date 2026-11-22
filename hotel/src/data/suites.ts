import { SuiteItem } from '../types'

const suites: SuiteItem[] = [
  { id: 's1', name: 'Standard Room', tier: 'standard', maxGuests: 2, price: 100 },
  { id: 's2', name: 'Ocean View Suite', tier: 'vista-mar', maxGuests: 4, price: 250 },
  { id: 's3', name: 'Presidential Suite', tier: 'presidencial', maxGuests: 6, price: 1000 }
]

export const listSuites = (): SuiteItem[] => suites

export const filterSuitesByGuests = (guests: number): SuiteItem[] => suites.filter((s) => s.maxGuests >= guests)

export const getSuiteById = (id: string): SuiteItem | undefined => suites.find((s) => s.id === id)
