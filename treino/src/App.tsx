import { useState } from 'react';
import { mockExercises, type Exercise } from './data';

function App() {
  const [exercises] = useState<Exercise[]>(mockExercises);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('Todos');

  const muscleGroups = ['Todos', ...new Set(exercises.map(ex => ex.muscleGroup))];

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
    const matchesGroup = selectedMuscleGroup === 'Todos' || ex.muscleGroup === selectedMuscleGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Treino</h1>
          <p className="text-gray-600">Acompanhe e filtre seus exercícios do dia.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar exercício..."
            className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="p-3 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMuscleGroup}
            onChange={(e) => setSelectedMuscleGroup(e.target.value)}
          >
            {muscleGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
            Nenhum exercício encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map(exercise => (
              <div key={exercise.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 leading-tight">{exercise.name}</h3>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {exercise.muscleGroup}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium text-gray-700">Séries:</span> {exercise.sets}</p>
                  <p><span className="font-medium text-gray-700">Repetições:</span> {exercise.reps}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;