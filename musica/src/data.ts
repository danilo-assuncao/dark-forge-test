export interface Song {
  id: string;
  title: string;
  duration: string;
  artist: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: number;
  songs: Song[];
}

export const albums: Album[] = [
  {
    id: '1',
    title: 'Midnight Echoes',
    artist: 'The Starlight Project',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=300&h=300',
    year: 2023,
    songs: [
      { id: '1-1', title: 'Cosmic Dance', duration: '3:45', artist: 'The Starlight Project' },
      { id: '1-2', title: 'Nebula Dreams', duration: '4:12', artist: 'The Starlight Project' },
      { id: '1-3', title: 'Solar Wind', duration: '3:28', artist: 'The Starlight Project' },
      { id: '1-4', title: 'Lunar Rise', duration: '5:01', artist: 'The Starlight Project' },
    ]
  },
  {
    id: '2',
    title: 'Urban Symphony',
    artist: 'City Soundscapes',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=300&h=300',
    year: 2022,
    songs: [
      { id: '2-1', title: 'Concrete Jungle', duration: '3:15', artist: 'City Soundscapes' },
      { id: '2-2', title: 'Neon Lights', duration: '4:30', artist: 'City Soundscapes' },
      { id: '2-3', title: 'Midnight Rush', duration: '2:55', artist: 'City Soundscapes' },
      { id: '2-4', title: 'Morning Hustle', duration: '3:40', artist: 'City Soundscapes' },
    ]
  },
  {
    id: '3',
    title: 'Acoustic Horizons',
    artist: 'Elena Rivers',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=300&h=300',
    year: 2024,
    songs: [
      { id: '3-1', title: 'Gentle Breeze', duration: '3:50', artist: 'Elena Rivers' },
      { id: '3-2', title: 'River Song', duration: '4:05', artist: 'Elena Rivers' },
      { id: '3-3', title: 'Mountain Peak', duration: '4:20', artist: 'Elena Rivers' },
      { id: '3-4', title: 'Forest Path', duration: '3:35', artist: 'Elena Rivers' },
      { id: '3-5', title: 'Sunset Glow', duration: '5:15', artist: 'Elena Rivers' },
    ]
  }
];
