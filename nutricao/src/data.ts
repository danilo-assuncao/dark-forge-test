import type { Diet, Food } from './types';

export const foodsData: Food[] = [
  { id: '1', name: 'Frango Grelhado', category: 'Carnes', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: '2', name: 'Arroz Integral', category: 'Grãos', calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  { id: '3', name: 'Brócolis', category: 'Vegetais', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { id: '4', name: 'Salmão', category: 'Peixes', calories: 206, protein: 22, carbs: 0, fat: 13 },
  { id: '5', name: 'Batata Doce', category: 'Carboidratos', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { id: '6', name: 'Ovo Cozido', category: 'Ovos', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { id: '7', name: 'Aveia', category: 'Grãos', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { id: '8', name: 'Abacate', category: 'Frutas', calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { id: '9', name: 'Banana', category: 'Frutas', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { id: '10', name: 'Amêndoas', category: 'Oleaginosas', calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9 },
];

export const dietsData: Diet[] = [
  {
    id: '1',
    name: 'Hipertrofia Muscular',
    description: 'Dieta focada em alto consumo de proteínas e carboidratos para ganho de massa magra.',
    goal: 'Ganho de Massa',
    recommendedFoods: ['1', '2', '5', '6']
  },
  {
    id: '2',
    name: 'Low Carb',
    description: 'Redução significativa de carboidratos, priorizando proteínas e gorduras boas.',
    goal: 'Emagrecimento',
    recommendedFoods: ['1', '3', '4', '6', '8']
  },
  {
    id: '3',
    name: 'Manutenção Saudável',
    description: 'Equilíbrio entre macronutrientes para manter a saúde e o peso corporal atual.',
    goal: 'Manutenção',
    recommendedFoods: ['1', '2', '3', '7', '9']
  },
  {
    id: '4',
    name: 'Keto (Cetogênica)',
    description: 'Alta em gorduras e muito baixa em carboidratos para induzir cetose.',
    goal: 'Emagrecimento',
    recommendedFoods: ['4', '6', '8', '10']
  }
];
