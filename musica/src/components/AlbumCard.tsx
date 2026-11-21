import { type Album } from '../data';

interface AlbumCardProps {
  album: Album;
  onClick: () => void;
  isSelected: boolean;
}

export function AlbumCard({ album, onClick, isSelected }: AlbumCardProps) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-lg text-left transition-all duration-200 group flex flex-col items-center ${
        isSelected ? 'bg-gray-800 ring-2 ring-green-500' : 'bg-gray-800/50 hover:bg-gray-800'
      }`}
      aria-label={`Select album ${album.title}`}
    >
      <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-md shadow-lg">
        <img 
          src={album.coverUrl} 
          alt={`${album.title} cover`} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <h3 className="font-semibold text-base w-full truncate" title={album.title}>{album.title}</h3>
      <p className="text-gray-400 text-sm w-full truncate mt-1" title={album.artist}>{album.artist} • {album.year}</p>
    </button>
  );
}
