/* Static academy application. Enrollment and progress stay in this browser. */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./catalog.js') : root.DanAcademyCatalog;
  const P = isNode ? require('./progress.js') : root.DanAcademyProgress;
  const KEY = 'dan-academy-enrollments';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const label = (items, id) => items.find(item => item.id === id).name;

  function search(query, track, level) {
    return C.CURSOS.filter(course => (!track || course.trilha === track) && (!level || course.nivel === level) &&
      normalize(course.title + ' ' + label(C.TRILHAS, course.trilha)).includes(normalize(query)));
  }

  function create(storage) {
    let enrollments = {};
    try {
      const saved = JSON.parse(storage.getItem(KEY));
      C.CURSOS.forEach(course => {
        const name = saved && saved[course.id];
        if (typeof name === 'string' && name.trim() && name.length <= 100) enrollments[course.id] = name.trim();
      });
    } catch (_) { /* Invalid local data starts a fresh enrollment list. */ }
    function enroll(id, name) {
      if (!C.findCurso(id)) throw new Error('Curso inválido.');
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('Informe um nome de até 100 caracteres.');
      if (enrollments[id]) return;
      const next = Object.assign({}, enrollments, { [id]: name.trim() });
      storage.setItem(KEY, JSON.stringify(next));
      enrollments = next;
    }
    return {
      enroll,
      student: id => enrollments[id] || null,
      courses: () => C.CURSOS.filter(course => enrollments[course.id]),
      watched: id => P.getWatched(id, storage),
      percent: id => P.getPercent(id, storage),
      certificate: id => enrollments[id] ? P.getCertificate(id, storage) : null,
      mark(id, lesson) {
        if (!enrollments[id]) throw new Error('Matricule-se antes de marcar aulas.');
        return P.markWatched(id, lesson, storage);
      }
    };
  }

  function initDom(doc, storage) {
    const $ = id => doc.getElementById(id);
    // Mirror reads in memory so a storage quota/permission failure cannot lose the current session.
    const memory = new Map();
    let persistent = true;
    const warn = () => { $('notice').textContent = 'Armazenamento indisponível. As alterações serão mantidas apenas nesta sessão.'; };
    const safeStorage = {
      getItem(key) {
        if (persistent) {
          try { const value = storage.getItem(key); memory.set(key, value); return value; }
          catch (_) { persistent = false; warn(); }
        }
        return memory.get(key) || null;
      },
      setItem(key, value) {
        memory.set(key, value);
        if (persistent) {
          try { storage.setItem(key, value); }
          catch (_) { persistent = false; warn(); }
        }
      }
    };
    // Prime both records before a possible write failure.
    safeStorage.getItem(P.STORAGE_KEY);
    const model = create(safeStorage);
    let pending = null;
    let returnFocus = null;
    function el(tag, text, cls) {
      const node = doc.createElement(tag);
      if (text != null) node.textContent = text;
      if (cls) node.className = cls;
      return node;
    }
    function button(text, action) {
      const node = el('button', text);
      node.type = 'button';
      node.addEventListener('click', action);
      return node;
    }
    function renderCatalog() {
      const courses = search($('query').value, $('track').value, $('level').value);
      $('course-list').replaceChildren();
      $('result-count').textContent = courses.length + ' curso(s) encontrado(s)';
      $('empty').hidden = courses.length > 0;
      courses.forEach(course => {
        const card = el('li', null, 'card');
        card.appendChild(el('span', label(C.TRILHAS, course.trilha), 'badge'));
        card.appendChild(el('h3', course.title));
        card.appendChild(el('p', label(C.NIVEIS, course.nivel) + ' · ' + course.durationHours + 'h · ' + course.modules + ' aulas', 'meta'));
        card.appendChild(button(model.student(course.id) ? 'Continuar estudos' : 'Matricular-se', () => {
          if (model.student(course.id)) { $('studies-title').focus(); return; }
          pending = course.id;
          $('enrollment-course').textContent = course.title;
          $('student-name').value = '';
          $('enrollment-error').textContent = '';
          $('student-name').setAttribute('aria-invalid', 'false');
          $('enrollment').hidden = false;
          $('enrollment-title').focus();
        }));
        $('course-list').appendChild(card);
      });
    }
    function showCertificate(course, trigger) {
      const cert = model.certificate(course.id);
      if (!cert) return;
      returnFocus = trigger;
      $('certificate-name').textContent = model.student(course.id);
      $('certificate-course').textContent = course.title + ' · ' + course.durationHours + ' horas';
      $('certificate-code').textContent = cert.code;
      $('certificate-date').textContent = cert.issuedAt ? 'Emitido em ' + new Date(cert.issuedAt).toLocaleDateString('pt-BR') : '';
      $('certificate').hidden = false;
      $('certificate-title').focus();
    }
    function renderStudies() {
      $('study-list').replaceChildren();
      $('studies-empty').hidden = model.courses().length > 0;
      model.courses().forEach(course => {
        const card = el('article', null, 'card');
        card.appendChild(el('h3', course.title));
        const progressText = el('p');
        progressText.setAttribute('aria-live', 'polite');
        const bar = el('progress');
        bar.max = 100;
        bar.setAttribute('aria-label', 'Progresso em ' + course.title);
        card.appendChild(progressText);
        card.appendChild(bar);
        const lessons = el('ul', null, 'lessons');
        const watched = model.watched(course.id);
        const certButton = button('Ver certificado', () => showCertificate(course, certButton));
        function update() {
          bar.value = model.percent(course.id);
          progressText.textContent = bar.value + '% concluído';
          certButton.hidden = !model.certificate(course.id);
        }
        for (let lesson = 1; lesson <= course.modules; lesson++) {
          const li = el('li');
          const wrapper = el('label');
          const input = el('input');
          input.type = 'checkbox';
          input.checked = watched.includes(lesson);
          input.disabled = input.checked;
          input.addEventListener('change', () => {
            if (!input.checked) return;
            model.mark(course.id, lesson);
            input.disabled = true;
            update();
            if (model.certificate(course.id)) {
              if (persistent) $('notice').textContent = 'Curso concluído! Seu certificado está disponível.';
              certButton.focus();
            }
          });
          wrapper.appendChild(input);
          wrapper.appendChild(el('span', 'Aula ' + lesson + ' — marcar como concluída'));
          li.appendChild(wrapper);
          lessons.appendChild(li);
        }
        card.appendChild(lessons);
        card.appendChild(certButton);
        update();
        $('study-list').appendChild(card);
      });
    }
    [[C.TRILHAS, 'track'], [C.NIVEIS, 'level']].forEach(([items, id]) => items.forEach(item => {
      const option = el('option', item.name); option.value = item.id; $(id).appendChild(option);
    }));
    $('filters').addEventListener('submit', event => event.preventDefault());
    $('filters').addEventListener('input', renderCatalog);
    $('filters').addEventListener('change', renderCatalog);
    $('filters').addEventListener('reset', event => {
      event.preventDefault();
      ['query', 'track', 'level'].forEach(id => { $(id).value = ''; });
      renderCatalog();
    });
    $('enrollment-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!pending) return;
      try { model.enroll(pending, $('student-name').value); }
      catch (error) {
        $('enrollment-error').textContent = error.message;
        $('student-name').setAttribute('aria-invalid', 'true');
        $('student-name').focus();
        return;
      }
      $('student-name').setAttribute('aria-invalid', 'false');
      pending = null;
      $('enrollment').hidden = true;
      if (persistent) $('notice').textContent = 'Matrícula confirmada! Suas aulas estão disponíveis em Meus estudos.';
      renderCatalog(); renderStudies(); $('studies-title').focus();
    });
    $('cancel-enrollment').addEventListener('click', () => {
      pending = null; $('enrollment').hidden = true;
      $('query').focus();
    });
    $('close-certificate').addEventListener('click', () => {
      $('certificate').hidden = true;
      if (returnFocus) returnFocus.focus();
    });
    renderCatalog(); renderStudies();
    return model;
  }
  const api = { search, create, initDom };
  if (isNode) module.exports = api;
  else {
    root.DanAcademyApp = api;
    const boot = () => {
      let storage;
      try { storage = root.localStorage; } catch (_) { /* Session fallback in initDom. */ }
      initDom(root.document, storage);
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
