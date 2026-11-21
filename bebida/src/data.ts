import type { Drink } from './types'

export const mockDrinks: Drink[] = [
  {
    id: '1',
    name: 'IPA Artesanal',
    category: 'Cerveja',
    price: 18.5,
    description: 'Cerveja IPA com notas cítricas e amargor intenso.',
    imageUrl:
      'https://images.unsplash.com/photo-1575037614876-c385244dd89e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2',
    name: 'Cabernet Sauvignon',
    category: 'Vinho',
    price: 85.0,
    description: 'Vinho tinto encorpado com aromas de frutas vermelhas.',
    imageUrl:
      'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '3',
    name: 'Gin Premium',
    category: 'Destilado',
    price: 120.0,
    description: 'Gin premium botânico ideal para drinks.',
    imageUrl:
      'https://images.unsplash.com/photo-1606859191214-25806e8e2423?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '4',
    name: 'Suco de Laranja Natural',
    category: 'Sem Álcool',
    price: 12.0,
    description: 'Suco natural de laranjas selecionadas, sem adição de açúcar.',
    imageUrl:
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '5',
    name: 'Lager Tradicional',
    category: 'Cerveja',
    price: 10.0,
    description: 'Cerveja leve e refrescante, ideal para o dia a dia.',
    imageUrl:
      'https://images.unsplash.com/photo-1614316788574-4b95bf0fa582?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '6',
    name: 'Água Tônica',
    category: 'Sem Álcool',
    price: 6.5,
    description: 'Água tônica refrescante com quinino.',
    imageUrl:
      'https://images.unsplash.com/photo-1587825027984-c42827ea3e11?auto=format&fit=crop&w=400&q=80',
  },
]
