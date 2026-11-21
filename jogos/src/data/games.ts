export interface Game {
  id: string;
  title: string;
  genre: string;
  price: number;
  rating: number;
  imageUrl: string;
  releaseDate: string;
}

export const simulatedGames: Game[] = [
  {
    id: '1',
    title: 'Galactic Horizon',
    genre: 'Sci-Fi RPG',
    price: 49.99,
    rating: 4.8,
    imageUrl: 'https://via.placeholder.com/300x200?text=Galactic+Horizon',
    releaseDate: '2023-11-15'
  },
  {
    id: '2',
    title: 'Medieval Quest',
    genre: 'Adventure',
    price: 29.99,
    rating: 4.5,
    imageUrl: 'https://via.placeholder.com/300x200?text=Medieval+Quest',
    releaseDate: '2022-05-10'
  },
  {
    id: '3',
    title: 'Speed Racer X',
    genre: 'Racing',
    price: 19.99,
    rating: 4.2,
    imageUrl: 'https://via.placeholder.com/300x200?text=Speed+Racer+X',
    releaseDate: '2024-01-20'
  },
  {
    id: '4',
    title: 'Zombie Survival',
    genre: 'Horror',
    price: 39.99,
    rating: 4.6,
    imageUrl: 'https://via.placeholder.com/300x200?text=Zombie+Survival',
    releaseDate: '2023-08-01'
  },
  {
    id: '5',
    title: 'City Builder Pro',
    genre: 'Simulation',
    price: 34.99,
    rating: 4.4,
    imageUrl: 'https://via.placeholder.com/300x200?text=City+Builder+Pro',
    releaseDate: '2021-12-05'
  },
  {
    id: '6',
    title: 'Puzzle Master',
    genre: 'Puzzle',
    price: 9.99,
    rating: 4.9,
    imageUrl: 'https://via.placeholder.com/300x200?text=Puzzle+Master',
    releaseDate: '2020-03-12'
  }
];
