/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('switches between Food and Diet tabs correctly', () => {
    render(<App />);
    
    // By default, it shows FoodCatalog
    expect(screen.getByText('Catálogo de Alimentos')).toBeInTheDocument();
    expect(screen.queryByText('Planos Alimentares (Dietas)')).not.toBeInTheDocument();

    // Click on Diet tab
    const dietButton = screen.getByRole('button', { name: 'Dietas' });
    fireEvent.click(dietButton);

    // It should now show DietCatalog
    expect(screen.getByText('Planos Alimentares (Dietas)')).toBeInTheDocument();
    expect(screen.queryByText('Catálogo de Alimentos')).not.toBeInTheDocument();

    // Click back to Food tab
    const foodButton = screen.getByRole('button', { name: 'Alimentos' });
    fireEvent.click(foodButton);

    // It should show FoodCatalog again
    expect(screen.getByText('Catálogo de Alimentos')).toBeInTheDocument();
    expect(screen.queryByText('Planos Alimentares (Dietas)')).not.toBeInTheDocument();
  });
});
