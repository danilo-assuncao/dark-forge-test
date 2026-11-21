import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('Meu Treino')).toBeInTheDocument();
  });

  it('renders initial exercises', () => {
    render(<App />);
    expect(screen.getByText('Supino Reto')).toBeInTheDocument();
    expect(screen.getByText('Agachamento Livre')).toBeInTheDocument();
  });

  it('filters exercises by search term', () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText('Buscar exercício...');
    fireEvent.change(searchInput, { target: { value: 'supino' } });
    
    expect(screen.getByText('Supino Reto')).toBeInTheDocument();
    expect(screen.queryByText('Agachamento Livre')).not.toBeInTheDocument();
  });

  it('filters exercises by muscle group', () => {
    render(<App />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Pernas' } });
    
    expect(screen.getByText('Agachamento Livre')).toBeInTheDocument();
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
  });

  it('shows empty state when no exercises match', () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText('Buscar exercício...');
    fireEvent.change(searchInput, { target: { value: 'exercicionaoexiste' } });
    
    expect(screen.getByText('Nenhum exercício encontrado.')).toBeInTheDocument();
  });
});