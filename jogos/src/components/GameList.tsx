import React, { useState } from 'react';
import { Game } from '../data/games';
import { GameCard } from './GameCard';

interface GameListProps {
  games: Game[];
}

export const GameList: React.FC<GameListProps> = ({ games }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const genres = Array.from(new Set(games.map(g => g.genre))).sort();

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre ? game.genre === selectedGenre : true;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search games..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/4">
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">No games found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};
