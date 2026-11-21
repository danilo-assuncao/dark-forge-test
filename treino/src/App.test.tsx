import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { mockExercises } from './data';

describe('App', () => {
  it('renders the title and all initial exercises', () => {
    render(<App />);
    expect(screen.getByText('Meu Treino')).toBeInTheDocument();
    
    mockExercises.forEach(ex => {
      expect(screen.getByText(ex.name)).toBeInTheDocument();
    });
  });

  it('renders card details for an exercise', () => {
    render(<App />);
    const firstEx = mockExercises[0];
    
    // Check if the specific text elements exist
    expect(screen.getByText(firstEx.name)).toBeInTheDocument();
    
    const card = screen.getByText(firstEx.name).closest('div')!.parentElement!;
    expect(within(card).getByText(firstEx.muscleGroup)).toBeInTheDocument();
    expect(within(card).getByText('Séries:')).toBeInTheDocument();
    expect(within(card).getByText(String(firstEx.sets))).toBeInTheDocument();
    expect(within(card).getByText('Repetições:')).toBeInTheDocument();
    expect(within(card).getByText(firstEx.reps)).toBeInTheDocument();
  });

  it('filters exercises by search term case-insensitively and handles spaces', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Buscar exercício...');
    const targetExercise = mockExercises[0].name;
    
    // Use upper case and trailing space
    await user.type(searchInput, ` ${targetExercise.toUpperCase().substring(0, 4)} `);
    
    expect(screen.getByText(targetExercise)).toBeInTheDocument();
    
    const nonMatchingExercise = mockExercises[1].name;
    expect(screen.queryByText(nonMatchingExercise)).not.toBeInTheDocument();
    
    // Check that we only render the matching cards
    const matchingCount = mockExercises.filter(ex => 
      ex.name.toLowerCase().includes(targetExercise.substring(0, 4).toLowerCase())
    ).length;
    
    expect(screen.getAllByText('Séries:')).toHaveLength(matchingCount);
  });

  it('filters exercises by muscle group and can reset to Todos', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(opt => opt.value);
    
    const uniqueGroups = ['Todos', ...new Set(mockExercises.map(ex => ex.muscleGroup))];
    expect(options).toEqual(uniqueGroups);
    
    const targetGroup = uniqueGroups[1]; // First actual muscle group
    await user.selectOptions(select, targetGroup);
    
    const matchingExercises = mockExercises.filter(ex => ex.muscleGroup === targetGroup);
    const nonMatchingExercises = mockExercises.filter(ex => ex.muscleGroup !== targetGroup);
    
    matchingExercises.forEach(ex => {
      expect(screen.getByText(ex.name)).toBeInTheDocument();
    });
    
    nonMatchingExercises.forEach(ex => {
      expect(screen.queryByText(ex.name)).not.toBeInTheDocument();
    });
    
    // Reset to 'Todos'
    await user.selectOptions(select, 'Todos');
    mockExercises.forEach(ex => {
      expect(screen.getByText(ex.name)).toBeInTheDocument();
    });
  });

  it('filters by search and muscle group together', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Buscar exercício...');
    const select = screen.getByRole('combobox');
    
    // Select group 'Pernas' and search for 'Supino' -> should yield empty
    await user.selectOptions(select, 'Pernas');
    await user.type(searchInput, 'supino');
    
    expect(screen.getByText('Nenhum exercício encontrado.')).toBeInTheDocument();
    
    // Select group 'Peito' and search for 'Supino' -> should yield match
    await user.selectOptions(select, 'Peito');
    
    expect(screen.queryByText('Nenhum exercício encontrado.')).not.toBeInTheDocument();
    expect(screen.getByText('Supino Reto')).toBeInTheDocument();
  });
});