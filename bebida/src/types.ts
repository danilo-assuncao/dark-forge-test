export interface Drink {
  id: string
  name: string
  category: 'Cerveja' | 'Vinho' | 'Destilado' | 'Sem Álcool'
  price: number
  description: string
  imageUrl: string
}
