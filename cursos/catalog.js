/* Dan Academy catalog: educational paths (Engenharia, Dados, etc) and modules/levels.
   Exposed as window.DanAcademyCatalog in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var TRILHAS = [
    { id: 'engenharia', name: 'Engenharia de Software' },
    { id: 'dados', name: 'Ciência de Dados' },
    { id: 'produto', name: 'Gestão de Produto' },
    { id: 'design', name: 'Design e UX' }
  ];

  var NIVEIS = [
    { id: 'iniciante', name: 'Iniciante' },
    { id: 'intermediario', name: 'Intermediário' },
    { id: 'avancado', name: 'Avançado' }
  ];

  var CURSOS = [
    { id: 'algoritmos-101', trilha: 'engenharia', nivel: 'iniciante', title: 'Algoritmos e Estruturas de Dados 101', durationHours: 40, modules: 4 },
    { id: 'arquitetura-distribuida', trilha: 'engenharia', nivel: 'avancado', title: 'Arquitetura de Sistemas Distribuídos', durationHours: 60, modules: 6 },
    { id: 'sql-fundamentos', trilha: 'dados', nivel: 'iniciante', title: 'Fundamentos de SQL', durationHours: 20, modules: 2 },
    { id: 'machine-learning', trilha: 'dados', nivel: 'intermediario', title: 'Machine Learning Prático', durationHours: 80, modules: 8 },
    { id: 'descoberta-produto', trilha: 'produto', nivel: 'intermediario', title: 'Descoberta de Produto Contínua', durationHours: 30, modules: 3 },
    { id: 'ux-research', trilha: 'design', nivel: 'iniciante', title: 'UX Research', durationHours: 35, modules: 4 }
  ];

  function findCurso(id) {
    for (var i = 0; i < CURSOS.length; i++) {
      if (CURSOS[i].id === id) return CURSOS[i];
    }
    return null;
  }

  function cursosPorTrilha(trilhaId) {
    if (!trilhaId) return CURSOS.slice();
    var list = [];
    for (var i = 0; i < CURSOS.length; i++) {
      if (CURSOS[i].trilha === trilhaId) list.push(CURSOS[i]);
    }
    return list;
  }

  function cursosPorNivel(nivelId) {
    if (!nivelId) return CURSOS.slice();
    var list = [];
    for (var i = 0; i < CURSOS.length; i++) {
      if (CURSOS[i].nivel === nivelId) list.push(CURSOS[i]);
    }
    return list;
  }

  var api = {
    TRILHAS: TRILHAS, NIVEIS: NIVEIS, CURSOS: CURSOS,
    findCurso: findCurso, cursosPorTrilha: cursosPorTrilha, cursosPorNivel: cursosPorNivel
  };
  
  root.DanAcademyCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
