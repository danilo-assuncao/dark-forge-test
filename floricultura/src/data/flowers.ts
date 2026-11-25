import type { FlowerSpecies, FlowerStem } from '../types'

const flowers: readonly FlowerStem[] = [
  {
    id: 'rosa-vermelha',
    name: 'Rosa Vermelha',
    species: 'rosa',
    color: 'vermelha',
    priceCents: 890,
    stockStems: 120,
    description: 'Clássica, para declarações de amor.'
  },
  {
    id: 'rosa-branca',
    name: 'Rosa Branca',
    species: 'rosa',
    color: 'branca',
    priceCents: 850,
    stockStems: 80
  },
  {
    id: 'tulipa-amarela',
    name: 'Tulipa Amarela',
    species: 'tulipa',
    color: 'amarela',
    priceCents: 1290,
    stockStems: 40,
    description: 'Alegre e elegante.'
  },
  {
    id: 'girassol',
    name: 'Girassol',
    species: 'girassol',
    color: 'amarela',
    priceCents: 1100,
    stockStems: 60
  },
  {
    id: 'orquidea-phalaenopsis',
    name: 'Orquídea Phalaenopsis',
    species: 'orquidea',
    color: 'lilás',
    priceCents: 4990,
    stockStems: 12,
    description: 'Haste de orquídea com várias flores.'
  },
  {
    id: 'lirio-branco',
    name: 'Lírio Branco',
    species: 'lirio',
    color: 'branca',
    priceCents: 1590,
    stockStems: 30
  },
  {
    id: 'margarida',
    name: 'Margarida',
    species: 'margarida',
    color: 'branca',
    priceCents: 450,
    stockStems: 0,
    description: 'Simples e delicada.'
  }
]

const copy = (flower: FlowerStem): FlowerStem => ({ ...flower })

export const listFlowers = (): FlowerStem[] => flowers.map(copy)

export const filterFlowersBySpecies = (species?: FlowerSpecies): FlowerStem[] =>
  flowers
    .filter((f) => species === undefined || f.species === species)
    .map(copy)

export const getFlowerById = (id: string): FlowerStem | undefined => {
  const flower = flowers.find((f) => f.id === id)
  return flower === undefined ? undefined : copy(flower)
}
