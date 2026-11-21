import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { type Album, type Song } from '../data';

interface PlayerProps {
  currentSong: Song;
  album: Album;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function Player({ currentSong, album, isPlaying, onTogglePlay }: PlayerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-gray-900 border-t border-gray-800 px-4 md:px-6 flex items-center justify-between z-50">
      
      {/* Now Playing Info */}
      <div className="flex items-center w-1/3 min-w-[180px]">
        <img 
          src={album.coverUrl} 
          alt={`${album.title} cover`} 
          className="w-14 h-14 rounded object-cover shadow-md hidden sm:block mr-4"
        />
        <div className="flex flex-col truncate">
          <span className="text-sm font-semibold text-white truncate">{currentSong.title}</span>
          <span className="text-xs text-gray-400 truncate">{currentSong.artist}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center w-1/3 max-w-md">
        <div className="flex items-center space-x-6 mb-2">
          <button className="text-gray-400 hover:text-white transition-colors" aria-label="Previous song">
            <SkipBack size={20} className="fill-current" />
          </button>
          
          <button 
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current ml-1" />
            )}
          </button>
          
          <button className="text-gray-400 hover:text-white transition-colors" aria-label="Next song">
            <SkipForward size={20} className="fill-current" />
          </button>
        </div>
        
        {/* Progress Bar (Visual Only) */}
        <div className="w-full flex items-center space-x-2 text-xs text-gray-400">
          <span>0:00</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-white w-1/3 rounded-full"></div>
          </div>
          <span>{currentSong.duration}</span>
        </div>
      </div>

      {/* Volume (Visual Only) */}
      <div className="w-1/3 flex items-center justify-end space-x-3 text-gray-400 hidden md:flex">
        <Volume2 size={20} />
        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-white w-2/3 rounded-full hover:bg-green-500 transition-colors"></div>
        </div>
      </div>
      
    </div>
  );
}
