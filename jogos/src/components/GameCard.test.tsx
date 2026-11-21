import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from './GameCard';
import type { Game } from '../data/games';

const mockGame: Game = {
  id: '1',
  title: 'Test Game',
  genre: 'Action',
  price: 10,
  rating: 4,
  imageUrl: 'test-image.jpg',
  releaseDate: '2023-01-01'
};

describe('GameCard Component', () => {
  it('renders game details with correct formatting', () => {
    render(<GameCard game={mockGame} />);
    
    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    
    // Price formatted with toFixed(2)
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    
    // Rating formatted with toFixed(1)
    expect(screen.getByText('4.0')).toBeInTheDocument();
    
    // Image alt text
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', 'Test Game');
    expect(image).toHaveAttribute('src', 'test-image.jpg');
  });
});
