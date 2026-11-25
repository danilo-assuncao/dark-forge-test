export type BakeCategory = 'pao' | 'doce' | 'salgado' | 'bolo'

export type MorningSlot = '05:30' | '06:30' | '07:30' | '08:30'

export interface BakeryItem {
  id: string
  name: string
  category: BakeCategory
  priceCents: number
  slot: MorningSlot // horário em que a fornada sai do forno
}

export interface BasketLine {
  itemId: string
  quantity: number
}
