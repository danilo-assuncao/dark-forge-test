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

  it('filters by search text on desktop', () => {
    render(<App />);
    
    const searchInput = screen.getByLabelText('Buscar móveis (Desktop)');
    fireEvent.change(searchInput, { target: { value: 'Poltrona' } });

    expect(screen.getByText('Poltrona Elegance')).toBeInTheDocument();
    expect(screen.queryByText('Mesa de Jantar Ágata')).not.toBeInTheDocument();
    
    // Check if state is synchronized across inputs
    const mobileInput = screen.getByLabelText('Buscar móveis (Mobile)');
    expect(mobileInput).toHaveValue('Poltrona');
  });

  it('filters by search text on mobile', () => {
    render(<App />);
    
    const searchInput = screen.getByLabelText('Buscar móveis (Mobile)');
    fireEvent.change(searchInput, { target: { value: 'Ágata' } });

    expect(screen.getByText('Mesa de Jantar Ágata')).toBeInTheDocument();
    expect(screen.queryByText('Poltrona Elegance')).not.toBeInTheDocument();
  });

  it('handles empty state when no items match', () => {
    render(<App />);
    const searchInput = screen.getByLabelText('Buscar móveis (Desktop)');
    
    fireEvent.change(searchInput, { target: { value: 'Produto Inexistente' } });

    expect(screen.getByText('Nenhum móvel encontrado para a sua busca.')).toBeInTheDocument();
  });

  it('filters by category and search together', () => {
    render(<App />);
    const searchInput = screen.getByLabelText('Buscar móveis (Desktop)');
    
    fireEvent.click(screen.getByRole('button', { name: 'Salas' }));
    fireEvent.change(searchInput, { target: { value: 'Sofá' } });

    expect(screen.getByText('Sofá Retrátil 3 Lugares')).toBeInTheDocument();
    expect(screen.queryByText('Poltrona Elegance')).not.toBeInTheDocument();
  });

  it('handles case-insensitive search', () => {
    render(<App />);
    const searchInput = screen.getByLabelText('Buscar móveis (Desktop)');
    
    fireEvent.change(searchInput, { target: { value: 'poltrona' } });

    expect(screen.getByText('Poltrona Elegance')).toBeInTheDocument();
  });

  it('restores full list when clicking "Todos"', () => {
    render(<App />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Cozinhas' }));
    expect(screen.queryByText('Poltrona Elegance')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('Poltrona Elegance')).toBeInTheDocument();
  });

  it('renders out-of-stock badge and disables cart button', () => {
    render(<App />);
    
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
    
    // The disabled button should be the one for 'Sofá Retrátil 3 Lugares'
    // Find its container and then the button, or use getAllByRole and check one is disabled
    const buttons = screen.getAllByRole('button', { name: 'Adicionar ao carrinho' });
    const disabledButtons = buttons.filter(b => (b as HTMLButtonElement).disabled);
    expect(disabledButtons).toHaveLength(1);
  });
});
