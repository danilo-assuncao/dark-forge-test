/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from '@testing-library/react';
import { FoodCatalog } from './FoodCatalog';
import type { Food } from '../types';
import { describe, it, expect } from 'vitest';

const mockFoods: Food[] = [
  { id: '1', name: 'Maçã', category: 'Frutas', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: '2', name: 'Frango', category: 'Carnes', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
];

describe('FoodCatalog', () => {
  it('renders correctly', () => {
    render(<FoodCatalog foods={mockFoods} />);
    expect(screen.getByText('Catálogo de Alimentos')).toBeInTheDocument();
    expect(screen.getByText('Maçã')).toBeInTheDocument();
    expect(screen.getByText('Frango')).toBeInTheDocument();
  });

  it('filters by search term with accent support and trim', () => {
    render(<FoodCatalog foods={mockFoods} />);
    const searchInput = screen.getByPlaceholderText('Buscar alimento...');
    
    fireEvent.change(searchInput, { target: { value: ' maca ' } });
    
    expect(screen.getByText('Maçã')).toBeInTheDocument();
    expect(screen.queryByText('Frango')).not.toBeInTheDocument();
  });

  it('filters by category and can reset', () => {
    render(<FoodCatalog foods={mockFoods} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'Carnes' } });
    
    expect(screen.queryByText('Maçã')).not.toBeInTheDocument();
    expect(screen.getByText('Frango')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: '' } });
    expect(screen.getByText('Maçã')).toBeInTheDocument();
    expect(screen.getByText('Frango')).toBeInTheDocument();
  });

  it('filters by combined search and category', () => {
    render(<FoodCatalog foods={mockFoods} />);
    const searchInput = screen.getByPlaceholderText('Buscar alimento...');
    const select = screen.getByRole('combobox');
    
    fireEvent.change(searchInput, { target: { value: 'fr' } });
    fireEvent.change(select, { target: { value: 'Carnes' } });
    
    expect(screen.queryByText('Maçã')).not.toBeInTheDocument();
    expect(screen.getByText('Frango')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'Frutas' } });
    expect(screen.queryByText('Maçã')).not.toBeInTheDocument();
    expect(screen.queryByText('Frango')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum alimento encontrado.')).toBeInTheDocument();
  });

  it('shows empty message for no match or empty foods', () => {
    const { rerender } = render(<FoodCatalog foods={mockFoods} />);
    const searchInput = screen.getByPlaceholderText('Buscar alimento...');
    
    fireEvent.change(searchInput, { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum alimento encontrado.')).toBeInTheDocument();

    rerender(<FoodCatalog foods={[]} />);
    expect(screen.getByText('Nenhum alimento encontrado.')).toBeInTheDocument();
  });
});
