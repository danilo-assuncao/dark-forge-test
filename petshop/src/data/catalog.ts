import type { PetServiceItem, GroomingAddon } from '../types'

const petServices: PetServiceItem[] = [
  {
    id: 's1',
    name: 'Banho Simples',
    description: 'Banho com shampoo neutro e secagem.',
    basePrice: 30,
    priceBySize: { pequeno: 30, medio: 45, grande: 60 }
  },
  {
    id: 's2',
    name: 'Tosa Higiênica',
    description: 'Tosa nas áreas íntimas, patas e barriga.',
    basePrice: 20,
    priceBySize: { pequeno: 20, medio: 25, grande: 35 }
  },
  {
    id: 's3',
    name: 'Tosa Completa',
    description: 'Tosa completa na máquina ou tesoura.',
    basePrice: 50,
    priceBySize: { pequeno: 50, medio: 70, grande: 100 }
  },
  {
    id: 's4',
    name: 'Consulta Veterinária',
    description: 'Avaliação clínica geral.',
    basePrice: 120,
    priceBySize: { pequeno: 120, medio: 120, grande: 120 }
  },
  {
    id: 's5',
    name: 'Vacinação Polivalente',
    description: 'Aplicação da vacina V10 ou V8.',
    basePrice: 90,
    priceBySize: { pequeno: 90, medio: 90, grande: 90 }
  },
  {
    id: 's6',
    name: 'Hidratação Profunda',
    description: 'Tratamento para pelos secos e quebradiços.',
    basePrice: 40,
    priceBySize: { pequeno: 40, medio: 60, grande: 80 }
  }
]

const groomingAddons: GroomingAddon[] = [
  { id: 'a1', name: 'Corte de Unhas', price: 15 },
  { id: 'a2', name: 'Limpeza de Ouvido', price: 15 },
  { id: 'a3', name: 'Escovação de Dentes', price: 20 }
]

export function listPetServices(): PetServiceItem[] {
  return petServices
}

export function listGroomingAddons(): GroomingAddon[] {
  return groomingAddons
}

export function getServiceById(id: string): PetServiceItem | undefined {
  return petServices.find((service) => service.id === id)
}
