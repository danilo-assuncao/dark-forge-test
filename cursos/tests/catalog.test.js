'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../catalog.js');

test('trilhas are defined', () => {
  assert.deepEqual(C.TRILHAS.map((t) => t.id), ['engenharia', 'dados', 'produto', 'design']);
});

test('niveis are defined', () => {
  assert.deepEqual(C.NIVEIS.map((n) => n.id), ['iniciante', 'intermediario', 'avancado']);
});

test('cursos by trilha', () => {
  const dados = C.cursosPorTrilha('dados');
  assert.equal(dados.length, 2);
  assert.equal(dados[0].title, 'Fundamentos de SQL');

  const all = C.cursosPorTrilha();
  assert.equal(all.length, C.CURSOS.length);
});

test('cursos by nivel', () => {
  const avancados = C.cursosPorNivel('avancado');
  assert.equal(avancados.length, 1);
  assert.equal(avancados[0].title, 'Arquitetura de Sistemas Distribuídos');

  const all = C.cursosPorNivel();
  assert.equal(all.length, C.CURSOS.length);
});

test('findCurso finds a curso', () => {
  const curso = C.findCurso('algoritmos-101');
  assert.ok(curso);
  assert.equal(curso.trilha, 'engenharia');
});

test('findCurso returns null for unknown curso', () => {
  const curso = C.findCurso('curso-inexistente');
  assert.equal(curso, null);
});
