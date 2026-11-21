import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the header title', () => {
    render(<App />);
    expect(screen.getByText('MobiDecor')).toBeInTheDocument();
  });

  it('renders categories filter', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cozinhas' })).toBeInTheDocument();
  });

  it('filters by category', () => {
    render(<App />);
    // Initial state: 'Todos'
    expect(screen.getByText('Poltrona Elegance')).toBeInTheDocument();
    expect(screen.getByText('Mesa de Jantar Ágata')).toBeInTheDocument();

    // Click 'Cozinhas'
    fireEvent.click(screen.getByRole('button', { name: 'Cozinhas' }));

    // 'Mesa de Jantar Ágata' should be there, 'Poltrona Elegance' should not
    expect(screen.getByText('Mesa de Jantar Ágata')).toBeInTheDocument();
    expect(screen.queryByText('Poltrona Elegance')).not.toBeInTheDocument();
  });

  it('filters by search text', () => {
    render(<App />);
    
    // Both mobile and desktop search inputs exist, pick the first one
    const searchInputs = screen.getAllByPlaceholderText('Buscar móveis...');
    
    fireEvent.change(searchInputs[0], { target: { value: 'Poltrona' } });

    expect(screen.getByText('Poltrona Elegance')).toBeInTheDocument();
    expect(screen.queryByText('Mesa de Jantar Ágata')).not.toBeInTheDocument();
  });
});
