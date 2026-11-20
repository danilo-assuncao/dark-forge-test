'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('../app.js');
const C = require('../catalog.js');
const P = require('../progress.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)) };
}
function environment(store = storage()) {
  const nodes = new Map();
  let focused;
  function node(tag) {
    return {
      tagName: tag, children: [], listeners: {}, attrs: {}, value: '', textContent: '', hidden: false,
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...children) { this.children = children; },
      setAttribute(key, value) { this.attrs[key] = String(value); },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      focus() { focused = this; },
      fire(type) { this.listeners[type]({ preventDefault() {} }); }
    };
  }
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const el = node(match[1]); el.hidden = /\bhidden\b/.test(match[2]); nodes.set(match[3], el);
  }
  const doc = { getElementById: id => { assert.ok(nodes.has(id), 'Missing HTML id: ' + id); return nodes.get(id); }, createElement: node };
  const model = A.initDom(doc, store);
  return { doc, model, store, $: id => doc.getElementById(id), focused: () => focused };
}
function descendants(node, tag) {
  return node.children.flatMap(child => [...(child.tagName === tag ? [child] : []), ...descendants(child, tag)]);
}
function choose(env, query = 'SQL') {
  env.$('query').value = query;
  env.$('filters').fire('input');
  descendants(env.$('course-list'), 'button')[0].fire('click');
}
function enroll(env, name = 'Ana Silva') {
  choose(env); env.$('student-name').value = name; env.$('enrollment-form').fire('submit');
}

test('search combines title, accent-insensitive track text, track and level', () => {
  assert.equal(A.search('', '', '').length, 6);
  assert.deepEqual(A.search(' ciencia ', 'dados', 'iniciante').map(c => c.id), ['sql-fundamentos']);
  assert.equal(A.search('pratico', 'dados', 'intermediario')[0].id, 'machine-learning');
  assert.equal(A.search('SQL', 'engenharia', '').length, 0);
});

test('filter events render combined results, empty state and reset', () => {
  const e = environment();
  assert.equal(e.$('course-list').children.length, 6);
  e.$('track').value = 'dados'; e.$('level').value = 'iniciante'; e.$('filters').fire('change');
  assert.equal(e.$('course-list').children.length, 1);
  e.$('query').value = 'no match'; e.$('filters').fire('input');
  assert.equal(e.$('empty').hidden, false);
  assert.equal(e.$('course-list').children.length, 0);
  e.$('filters').fire('reset');
  assert.equal(e.$('course-list').children.length, 6);
  assert.equal(e.$('empty').hidden, true);
});

test('enrollment validates, cancels without mutation, confirms and resumes without duplicate', () => {
  const e = environment();
  choose(e);
  assert.equal(e.$('enrollment').hidden, false);
  e.$('student-name').value = '   '; e.$('enrollment-form').fire('submit');
  assert.match(e.$('enrollment-error').textContent, /Informe um nome/);
  assert.equal(e.$('student-name').attrs['aria-invalid'], 'true');
  assert.equal(e.focused(), e.$('student-name'));
  assert.equal(e.model.courses().length, 0);
  e.$('cancel-enrollment').fire('click');
  e.$('enrollment-form').fire('submit');
  assert.equal(e.model.courses().length, 0);
  enroll(e, '  Ana Silva  ');
  assert.equal(e.model.student('sql-fundamentos'), 'Ana Silva');
  assert.equal(e.$('student-name').attrs['aria-invalid'], 'false');
  assert.equal(e.$('enrollment').hidden, true);
  assert.equal(e.$('study-list').children.length, 1);
  choose(e);
  assert.equal(e.$('enrollment').hidden, true);
  assert.equal(e.focused(), e.$('studies-title'));
  assert.equal(e.model.courses().length, 1);
});

test('lesson UI issues certificate only at completion, restores progress and safely renders names', () => {
  const e = environment();
  const name = '<img src=x onerror=alert(1)>';
  enroll(e, name);
  assert.equal(e.$('notice').textContent, 'Matrícula confirmada! Suas aulas estão disponíveis em Meus estudos.');
  const lessons = descendants(e.$('study-list'), 'input');
  const cert = descendants(e.$('study-list'), 'button')[0];
  assert.equal(cert.hidden, true);
  lessons[0].checked = true; lessons[0].fire('change');
  assert.equal(e.model.percent('sql-fundamentos'), 50);
  assert.equal(cert.hidden, true);
  assert.equal(lessons[0].disabled, true);
  lessons[1].checked = true; lessons[1].fire('change');
  assert.equal(cert.hidden, false);
  assert.equal(e.$('notice').textContent, 'Curso concluído! Seu certificado está disponível.');
  cert.fire('click');
  assert.equal(e.$('certificate').hidden, false);
  assert.equal(e.$('certificate-name').textContent, name);
  assert.equal(e.$('certificate-name').children.length, 0);
  assert.match(e.$('certificate-code').textContent, /^CERT-[A-Z0-9]{4}$/);
  assert.match(e.$('certificate-date').textContent, /^Emitido em /);
  e.$('close-certificate').fire('click');
  assert.equal(e.$('certificate').hidden, true);
  assert.equal(e.focused(), cert);
  const reloaded = environment(e.store);
  assert.equal(reloaded.model.percent('sql-fundamentos'), 100);
  assert.ok(descendants(reloaded.$('study-list'), 'input').every(input => input.checked && input.disabled));
  assert.equal(reloaded.model.certificate('sql-fundamentos').code, e.$('certificate-code').textContent);
});

test('model rejects invalid enrollments and lessons, and isolates courses', () => {
  const s = storage(); const app = A.create(s);
  assert.throws(() => app.enroll('unknown', 'Ana'), /Curso inválido/);
  for (const name of ['', ' ', null, 'a'.repeat(101)]) assert.throws(() => app.enroll('sql-fundamentos', name));
  assert.throws(() => app.mark('sql-fundamentos', 1), /Matricule-se/);
  app.enroll('sql-fundamentos', 'Ana'); app.enroll('ux-research', 'Ana');
  app.enroll('sql-fundamentos', 'Other');
  assert.equal(app.student('sql-fundamentos'), 'Ana');
  assert.throws(() => app.mark('sql-fundamentos', 3), /Invalid lesson/);
  app.mark('sql-fundamentos', 1); app.mark('sql-fundamentos', 1);
  assert.equal(app.percent('sql-fundamentos'), 50);
  assert.equal(app.percent('ux-research'), 0);
});

test('malformed enrollment data is ignored', () => {
  for (const raw of ['{bad', 'null', '[]', '{"sql-fundamentos":42}', '{"sql-fundamentos":" ","unknown":"Ana"}']) {
    const s = storage(); s.setItem('dan-academy-enrollments', raw);
    assert.deepEqual(A.create(s).courses(), []);
  }
});

test('blocked storage permits enrollment and completion in the session with a warning', () => {
  const e = environment({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  enroll(e);
  descendants(e.$('study-list'), 'input').forEach(input => { input.checked = true; input.fire('change'); });
  assert.equal(e.model.percent('sql-fundamentos'), 100);
  assert.match(e.$('notice').textContent, /apenas nesta sessão/);
});

test('write failure preserves previously loaded progress and enrollments in memory', () => {
  const s = storage(); const app = A.create(s);
  app.enroll('sql-fundamentos', 'Ana'); app.mark('sql-fundamentos', 1);
  s.setItem = () => { throw Error('quota'); };
  const e = environment(s);
  const input = descendants(e.$('study-list'), 'input')[1];
  input.checked = true; input.fire('change');
  assert.equal(e.model.percent('sql-fundamentos'), 100);
  assert.match(e.$('notice').textContent, /apenas nesta sessão/);
});

test('browser entry boots with unavailable localStorage and exposes the application', () => {
  const e = environment();
  e.doc.readyState = 'complete';
  const win = { document: e.doc, DanAcademyCatalog: C, DanAcademyProgress: P };
  Object.defineProperty(win, 'localStorage', { get() { throw Error('blocked'); } });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), { window: win });
  assert.equal(typeof win.DanAcademyApp.initDom, 'function');
  assert.equal(e.$('course-list').children.length, 6);
});

test('page loads dependencies in order', () => {
  assert.ok(html.indexOf('src="catalog.js"') < html.indexOf('src="progress.js"'));
  assert.ok(html.indexOf('src="progress.js"') < html.indexOf('src="app.js"'));
});
