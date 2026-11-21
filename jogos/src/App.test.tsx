import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { simulatedGames } from './data/games';

describe('App Component', () => {
  it('renders the header correctly', () => {
    render(<App />);
    expect(screen.getByText('GameStore UI')).toBeInTheDocument();
  });

  it('renders the footer', () => {
    render(<App />);
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
  });
  
  it('renders exactly the number of game cards as simulated games', () => {
    render(<App />);
    const cards = screen.getAllByTestId('game-card');
    expect(cards).toHaveLength(simulatedGames.length);
  });
});
