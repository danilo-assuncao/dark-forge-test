export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  imageUrl?: string;
}

export const mockExercises: Exercise[] = [
  {
    id: '1',
    name: 'Supino Reto',
    category: 'Força',
    muscleGroup: 'Peito',
    sets: 4,
    reps: '8-10'
  },
  {
    id: '2',
    name: 'Agachamento Livre',
    category: 'Força',
    muscleGroup: 'Pernas',
    sets: 4,
    reps: '10-12'
  },
  {
    id: '3',
    name: 'Puxada Frontal',
    category: 'Força',
    muscleGroup: 'Costas',
    sets: 3,
    reps: '10-12'
  },
  {
    id: '4',
    name: 'Desenvolvimento com Halteres',
    category: 'Força',
    muscleGroup: 'Ombros',
    sets: 3,
    reps: '10-12'
  },
  {
    id: '5',
    name: 'Rosca Direta',
    category: 'Força',
    muscleGroup: 'Bíceps',
    sets: 3,
    reps: '12'
  },
  {
    id: '6',
    name: 'Tríceps Testa',
    category: 'Força',
    muscleGroup: 'Tríceps',
    sets: 3,
    reps: '12'
  }
];