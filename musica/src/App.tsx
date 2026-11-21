import { useState } from 'react';
import { type Album, albums, type Song } from './data';
import { AlbumCard } from './components/AlbumCard';
import { Playlist } from './components/Playlist';
import { Player } from './components/Player';

function App() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album>(albums[0]);
  const [playingAlbum, setPlayingAlbum] = useState<Album>(albums[0]);
  const [currentSong, setCurrentSong] = useState<Song>(albums[0].songs[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handlePlaySong = (song: Song, album: Album) => {
    if (song.id === currentSong.id) {
      setIsPlaying(!isPlaying);
      return;
    }
    setPlayingAlbum(album);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const currentIndex = playingAlbum.songs.findIndex(s => s.id === currentSong.id);
    if (currentIndex < playingAlbum.songs.length - 1) {
      setCurrentSong(playingAlbum.songs[currentIndex + 1]);
    } else {
      setCurrentSong(playingAlbum.songs[0]);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    const currentIndex = playingAlbum.songs.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(playingAlbum.songs[currentIndex - 1]);
    } else {
      setCurrentSong(playingAlbum.songs[playingAlbum.songs.length - 1]);
    }
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-800 flex items-center">
        <h1 className="text-2xl font-bold text-green-400">Musica SPA</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="max-w-7xl mx-auto">
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Featured Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {albums.map((album) => (
                <AlbumCard 
                  key={album.id} 
                  album={album} 
                  onClick={() => setSelectedAlbum(album)}
                  isSelected={selectedAlbum.id === album.id}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">
              {selectedAlbum.title} <span className="text-sm font-normal text-gray-500">by {selectedAlbum.artist}</span>
            </h2>
            <Playlist 
              album={selectedAlbum} 
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlaySong={(song) => handlePlaySong(song, selectedAlbum)}
            />
          </section>
        </div>
      </main>

      <Player 
        currentSong={currentSong}
        album={playingAlbum}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </div>
  );
}

export default App;
