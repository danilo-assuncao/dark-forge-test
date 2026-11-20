(function(global) {
  'use strict';

  const EXAMS = [
    {
      id: 'hemograma',
      name: 'Hemograma Completo',
      type: 'laboratorial',
      price: 25.00,
      fastingHours: 8,
      turnaroundDays: 1
    },
    {
      id: 'glicemia',
      name: 'Glicemia em Jejum',
      type: 'laboratorial',
      price: 15.00,
      fastingHours: 8,
      turnaroundDays: 1
    },
    {
      id: 'colesterol',
      name: 'Colesterol Total e Frações',
      type: 'laboratorial',
      price: 30.00,
      fastingHours: 12,
      turnaroundDays: 2
    },
    {
      id: 'tsh',
      name: 'TSH Ultrasensível',
      type: 'laboratorial',
      price: 40.00,
      fastingHours: 4,
      turnaroundDays: 2
    },
    {
      id: 'vitamina_d',
      name: 'Vitamina D (25 OH)',
      type: 'laboratorial',
      price: 60.00,
      fastingHours: 0,
      turnaroundDays: 3
    },
    {
      id: 'checkup_basico',
      name: 'Check-up Básico',
      type: 'checkup',
      price: 120.00,
      fastingHours: 12,
      turnaroundDays: 2,
      description: 'Avaliação inicial da saúde geral.',
      included: ['hemograma', 'glicemia', 'colesterol']
    },
    {
      id: 'checkup_completo',
      name: 'Check-up Completo',
      type: 'checkup',
      price: 200.00,
      fastingHours: 12,
      turnaroundDays: 3,
      description: 'Avaliação abrangente da saúde geral e metabólica.',
      included: ['hemograma', 'glicemia', 'colesterol', 'tsh', 'vitamina_d']
    }
  ];

  const ClinicaExams = {
    all: () => EXAMS.slice(),
    
    find: (id) => EXAMS.find(e => e.id === id) || null,
    
    findByType: (type) => EXAMS.filter(e => e.type === type),
    
    labExams: () => EXAMS.filter(e => e.type === 'laboratorial'),
    
    checkups: () => EXAMS.filter(e => e.type === 'checkup')
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClinicaExams;
  } else {
    global.ClinicaExams = ClinicaExams;
  }
})(typeof window !== 'undefined' ? window : this);
