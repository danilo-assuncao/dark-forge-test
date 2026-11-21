import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameList } from './GameList';
import { Game } from '../data/games';

const mockGames: Game[] = [
  { id: '1', title: 'Game A', genre: 'Action', price: 10, rating: 4, imageUrl: '', releaseDate: '2020' },
  { id: '2', title: 'Game B', genre: 'RPG', price: 20, rating: 5, imageUrl: '', releaseDate: '2021' },
];

describe('GameList Component', () => {
  beforeEach(() => {
    render(<GameList games={mockGames} />);
  });

  it('renders all games initially', () => {
    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
  });

  it('filters games by search term', () => {
    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'Game A' } });

    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.queryByText('Game B')).not.toBeInTheDocument();
  });

  it('filters games by genre', () => {
    const genreSelect = screen.getByRole('combobox');
    fireEvent.change(genreSelect, { target: { value: 'RPG' } });

    expect(screen.queryByText('Game A')).not.toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
  });

  it('shows no games message when no match', () => {
    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Game' } });

    expect(screen.getByText('No games found matching your criteria.')).toBeInTheDocument();
    expect(screen.queryByText('Game A')).not.toBeInTheDocument();
    expect(screen.queryByText('Game B')).not.toBeInTheDocument();
  });
});
