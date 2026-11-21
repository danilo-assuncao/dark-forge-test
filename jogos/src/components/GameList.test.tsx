import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameList } from './GameList';
import type { Game } from '../data/games';

const mockGames: Game[] = [
  { id: '1', title: 'Game A', genre: 'Action', price: 10, rating: 4, imageUrl: '', releaseDate: '2020' },
  { id: '2', title: 'Game B', genre: 'RPG', price: 20, rating: 5, imageUrl: '', releaseDate: '2021' },
  { id: '3', title: 'Game C', genre: 'Action', price: 30, rating: 4.5, imageUrl: '', releaseDate: '2022' },
];

describe('GameList Component', () => {
  beforeEach(() => {
    render(<GameList games={mockGames} />);
  });

  it('renders all games initially', () => {
    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
    expect(screen.getByText('Game C')).toBeInTheDocument();
  });

  it('filters games by search term case-insensitively', () => {
    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'game a' } });

    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.queryByText('Game B')).not.toBeInTheDocument();
  });

  it('filters games by genre', () => {
    const genreSelect = screen.getByRole('combobox');
    fireEvent.change(genreSelect, { target: { value: 'RPG' } });

    expect(screen.queryByText('Game A')).not.toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
  });

  it('filters games by combining search and genre', () => {
    const searchInput = screen.getByPlaceholderText('Search games...');
    const genreSelect = screen.getByRole('combobox');

    fireEvent.change(searchInput, { target: { value: 'Game' } });
    fireEvent.change(genreSelect, { target: { value: 'RPG' } });

    expect(screen.queryByText('Game A')).not.toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
    expect(screen.queryByText('Game C')).not.toBeInTheDocument();
  });

  it('restores all games when genre is cleared', () => {
    const genreSelect = screen.getByRole('combobox');
    fireEvent.change(genreSelect, { target: { value: 'RPG' } });
    expect(screen.queryByText('Game A')).not.toBeInTheDocument();

    fireEvent.change(genreSelect, { target: { value: '' } });
    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
  });

  it('shows no games message when no match', () => {
    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Game' } });

    expect(screen.getByText('No games found matching your criteria.')).toBeInTheDocument();
    expect(screen.queryByText('Game A')).not.toBeInTheDocument();
  });
});

describe('GameList Component - Edge Cases', () => {
  it('handles empty games array', () => {
    render(<GameList games={[]} />);
    expect(screen.getByText('No games found matching your criteria.')).toBeInTheDocument();
  });

  it('deduplicates and sorts genre options', () => {
    render(<GameList games={mockGames} />);
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    const values = options.map(o => o.value);
    
    expect(values).toEqual(['', 'Action', 'RPG']);
    expect(options[0].textContent).toBe('All Genres');
  });
});

