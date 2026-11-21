/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { DietCatalog } from './DietCatalog';
import type { Diet, Food } from '../types';
import { describe, it, expect } from 'vitest';

const mockFoods: Food[] = [
  { id: '1', name: 'Maçã', category: 'Frutas', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: '2', name: 'Frango', category: 'Carnes', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
];

const mockDiets: Diet[] = [
  {
    id: '1',
    name: 'Dieta Teste',
    description: 'Descrição de teste',
    goal: 'Teste',
    recommendedFoods: ['1']
  }
];

describe('DietCatalog', () => {
  it('renders correctly', () => {
    render(<DietCatalog diets={mockDiets} foods={mockFoods} />);
    expect(screen.getByText('Planos Alimentares (Dietas)')).toBeInTheDocument();
    expect(screen.getByText('Dieta Teste')).toBeInTheDocument();
    expect(screen.getByText('Descrição de teste')).toBeInTheDocument();
    expect(screen.getByText('Maçã')).toBeInTheDocument();
    expect(screen.queryByText('Frango')).not.toBeInTheDocument();
    expect(screen.getByText('Teste')).toBeInTheDocument();
  });

  it('shows empty message when diets array is empty', () => {
    render(<DietCatalog diets={[]} foods={mockFoods} />);
    expect(screen.getByText('Nenhuma dieta encontrada.')).toBeInTheDocument();
  });

  it('handles diet with unknown foods or empty recommendedFoods', () => {
    const edgeDiets: Diet[] = [
      {
        id: '1',
        name: 'Dieta Vazia',
        description: 'Sem alimentos',
        goal: 'Vazio',
        recommendedFoods: []
      },
      {
        id: '2',
        name: 'Dieta Quebrada',
        description: 'Alimentos inexistentes',
        goal: 'Quebrado',
        recommendedFoods: ['999']
      }
    ];

    render(<DietCatalog diets={edgeDiets} foods={mockFoods} />);
    
    const fallbackMessages = screen.getAllByText('Nenhum alimento resolvido para esta dieta.');
    expect(fallbackMessages).toHaveLength(2);
  });
});
