export type SectorTier = 'pista' | 'vip' | 'camarote'

export type BatchNumber = 1 | 2 | 3

export type TicketBenefitType = 'inteira' | 'estudante' | 'idoso' | 'social'

export interface LiveEventItem {
  id: string
  name: string
  city: string
  date: string
  sector: SectorTier
  batch: BatchNumber
  benefit: TicketBenefitType
  price: number
}
