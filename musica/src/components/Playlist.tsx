import { Play, Pause } from 'lucide-react';
import { type Album, type Song } from '../data';

interface PlaylistProps {
  album: Album;
  currentSong: Song;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
}

export function Playlist({ album, currentSong, isPlaying, onPlaySong }: PlaylistProps) {
  return (
    <div className="bg-gray-800/30 rounded-lg overflow-hidden border border-gray-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-sm">
            <th className="px-4 py-3 font-medium w-12 text-center">#</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Artist</th>
            <th className="px-4 py-3 font-medium text-right">Duration</th>
          </tr>
        </thead>
        <tbody>
          {album.songs.map((song, index) => {
            const isCurrent = currentSong.id === song.id;
            return (
              <tr 
                key={song.id} 
                className={`group border-b border-gray-800/50 last:border-0 hover:bg-gray-800/80 transition-colors ${
                  isCurrent ? 'bg-gray-800/60' : ''
                }`}
              >
                <td className="px-4 py-3 text-center">
                  <div className="w-6 h-6 mx-auto flex items-center justify-center">
                    <button
                      onClick={() => onPlaySong(song)}
                      className={`text-gray-400 hover:text-white ${isCurrent ? 'text-green-500' : 'group-hover:block md:hidden block md:group-hover:block'}`}
                      aria-label={isCurrent && isPlaying ? "Playing" : `Play ${song.title}`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={16} className="text-green-500" />
                      ) : isCurrent ? (
                        <Play size={16} className="text-green-500 fill-current" />
                      ) : (
                        <Play size={16} className="md:opacity-0 md:group-hover:opacity-100 fill-current" />
                      )}
                    </button>
                    {!isCurrent && (
                      <span className="text-gray-500 md:block hidden group-hover:hidden">
                        {index + 1}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                  <span className={isCurrent ? 'text-green-500' : 'text-gray-200'}>
                    {song.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                  {song.artist}
                </td>
                <td className="px-4 py-3 text-gray-400 text-right">
                  {song.duration}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
