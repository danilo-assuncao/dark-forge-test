import React from 'react';
import type { Game } from '../data/games';

interface GameCardProps {
  game: Game;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col" data-testid="game-card">
      <img 
        src={game.imageUrl} 
        alt={game.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-1">{game.title}</h3>
        <p className="text-sm text-gray-500 mb-2">{game.genre}</p>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          <span className="text-lg font-bold text-primary">${game.price.toFixed(2)}</span>
          <div className="flex items-center">
            <span className="text-yellow-500 mr-1">★</span>
            <span className="text-gray-700 font-medium">{game.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
