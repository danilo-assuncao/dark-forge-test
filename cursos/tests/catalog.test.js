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
  const titles = dados.map(d => d.title).sort();
  assert.deepEqual(titles, ['Fundamentos de SQL', 'Machine Learning Prático']);

  const all = C.cursosPorTrilha();
  assert.equal(all.length, C.CURSOS.length);
  assert.notEqual(all, C.CURSOS, 'should return a copy');

  const empty = C.cursosPorTrilha('inexistente');
  assert.deepEqual(empty, []);
  
  const fromNull = C.cursosPorTrilha(null);
  assert.equal(fromNull.length, C.CURSOS.length);
  const fromEmptyStr = C.cursosPorTrilha('');
  assert.equal(fromEmptyStr.length, C.CURSOS.length);
});

test('cursos by nivel', () => {
  const avancados = C.cursosPorNivel('avancado');
  assert.equal(avancados.length, 1);
  assert.equal(avancados[0].title, 'Arquitetura de Sistemas Distribuídos');

  const all = C.cursosPorNivel();
  assert.equal(all.length, C.CURSOS.length);
  assert.notEqual(all, C.CURSOS, 'should return a copy');

  const empty = C.cursosPorNivel('inexistente');
  assert.deepEqual(empty, []);

  const fromNull = C.cursosPorNivel(null);
  assert.equal(fromNull.length, C.CURSOS.length);
  const fromEmptyStr = C.cursosPorNivel('');
  assert.equal(fromEmptyStr.length, C.CURSOS.length);
});

test('findCurso finds a curso', () => {
  const curso = C.findCurso('algoritmos-101');
  assert.ok(curso);
  assert.equal(curso.trilha, 'engenharia');
});

test('findCurso returns null for unknown or empty curso', () => {
  assert.equal(C.findCurso('curso-inexistente'), null);
  assert.equal(C.findCurso(undefined), null);
  assert.equal(C.findCurso(null), null);
});

test('every curso has valid trilha, nivel, unique id and positive durations', () => {
  const trilhaIds = new Set(C.TRILHAS.map(t => t.id));
  const nivelIds = new Set(C.NIVEIS.map(n => n.id));
  const cursoIds = new Set();

  C.CURSOS.forEach(curso => {
    assert.ok(trilhaIds.has(curso.trilha), `Curso ${curso.id} has unknown trilha: ${curso.trilha}`);
    assert.ok(nivelIds.has(curso.nivel), `Curso ${curso.id} has unknown nivel: ${curso.nivel}`);
    
    assert.ok(!cursoIds.has(curso.id), `Duplicate curso id: ${curso.id}`);
    cursoIds.add(curso.id);

    assert.ok(typeof curso.durationHours === 'number' && curso.durationHours > 0, `Curso ${curso.id} invalid durationHours`);
    assert.ok(typeof curso.modules === 'number' && curso.modules > 0, `Curso ${curso.id} invalid modules`);
  });
});
