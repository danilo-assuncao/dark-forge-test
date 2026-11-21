import React from 'react';
import { simulatedGames } from './data/games';
import { GameList } from './components/GameList';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-gray-900 text-white py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight">GameStore UI</h1>
        </div>
      </header>
      
      <main>
        <GameList games={simulatedGames} />
      </main>
      
      <footer className="bg-gray-800 text-gray-300 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} GameStore UI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
