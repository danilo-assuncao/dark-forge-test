/* Dan Saúde SPA: unifies the doctor catalog, the exam catalog and the quote
   engine into one flow (find a doctor -> pick a slot -> add exams/check-up ->
   combined summary). Pure helpers are exported for Node tests; the DOM is only
   touched by init(). */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var Doctors = isNode ? require('./doctors.js') : root.ClinicaDoctors;
  var Exams = isNode ? require('./exams.js') : root.ClinicaExams;
  var Quote = isNode ? require('./quote.js') : root.ClinicaQuote;

  var SLOT_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
  var FASTING_CUTOFF = '10:00'; // fasting exams: appointment must start before this
  var DEFAULT_COPAY = 30; // demo patient copay (%) for insurance plans
  var PARTICULAR = Doctors.insurances.PARTICULAR;

  var SEED = [
    { name: 'Dra. Helena Duarte', crm: 'CRM-SP 101234', specialty: Doctors.specialties.GENERAL_PRACTICE,
      modalities: [Doctors.modalities.IN_PERSON, Doctors.modalities.TELECONSULTATION],
      insurances: [Doctors.insurances.AMIL, Doctors.insurances.UNIMED, Doctors.insurances.PARTICULAR] },
    { name: 'Dr. Rafael Moura', crm: 'CRM-SP 102345', specialty: Doctors.specialties.CARDIOLOGY,
      modalities: [Doctors.modalities.IN_PERSON],
      insurances: [Doctors.insurances.BRADESCO, Doctors.insurances.SULAMERICA, Doctors.insurances.PARTICULAR] },
    { name: 'Dra. Camila Torres', crm: 'CRM-SP 103456', specialty: Doctors.specialties.DERMATOLOGY,
      modalities: [Doctors.modalities.IN_PERSON, Doctors.modalities.TELECONSULTATION],
      insurances: [Doctors.insurances.UNIMED, Doctors.insurances.PARTICULAR] },
    { name: 'Dr. Lucas Barros', crm: 'CRM-SP 104567', specialty: Doctors.specialties.PEDIATRICS,
      modalities: [Doctors.modalities.IN_PERSON, Doctors.modalities.TELECONSULTATION],
      insurances: [Doctors.insurances.AMIL, Doctors.insurances.BRADESCO, Doctors.insurances.PARTICULAR] },
    { name: 'Dra. Marina Pires', crm: 'CRM-SP 105678', specialty: Doctors.specialties.NEUROLOGY,
      modalities: [Doctors.modalities.IN_PERSON],
      insurances: [Doctors.insurances.SULAMERICA, Doctors.insurances.PARTICULAR] },
    { name: 'Dr. Tiago Almeida', crm: 'CRM-SP 106789', specialty: Doctors.specialties.ORTHOPEDICS,
      modalities: [Doctors.modalities.IN_PERSON],
      insurances: [Doctors.insurances.UNIMED, Doctors.insurances.AMIL, Doctors.insurances.PARTICULAR] }
  ];

  var REASONS = {
    'no-doctor': 'Selecione um médico.',
    'unknown-doctor': 'Médico não encontrado.',
    'bad-modality': 'Este médico não atende nessa modalidade.',
    'bad-date': 'Escolha uma data válida em dia útil.',
    'bad-slot': 'Horário indisponível.',
    'taken': 'Esse horário acabou de ser ocupado.',
    'fasting-slot': 'Com exames em jejum, escolha um horário antes das 10:00.',
    'no-draft': 'Escolha médico, data e horário antes de confirmar.'
  };

  function formatBRL(value) {
    var cents = Math.round(value * 100);
    var abs = Math.abs(cents);
    var reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (cents < 0 ? '-' : '') + 'R$ ' + reais + ',' + ('0' + (abs % 100)).slice(-2);
  }

  function parseISO(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.toISOString().slice(0, 10) === iso ? d : null;
  }

  function isWeekday(iso) {
    var d = parseISO(iso);
    return !!d && d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
  }

  function addDays(iso, n) {
    var d = parseISO(iso);
    if (!d) return null;
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    return iso ? iso.split('-').reverse().join('/') : '';
  }

  function localISO(date) {
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    return date.getFullYear() + '-' + m + '-' + d;
  }

  function seedCatalog() {
    var catalog = new Doctors.DoctorCatalog();
    SEED.forEach(function (d) { catalog.addDoctor(d); });
    return catalog;
  }

  function createState(catalog) {
    return {
      catalog: catalog || seedCatalog(),
      examIds: [],
      insurance: PARTICULAR,
      coupon: '',
      draft: { doctorId: null, modality: null, date: null, time: null },
      appointments: []
    };
  }

  function filterDoctors(catalog, f) {
    f = f || {};
    return catalog.getAllDoctors().filter(function (d) {
      return (!f.specialty || d.specialty === f.specialty) &&
        (!f.modality || d.modalities.indexOf(f.modality) !== -1) &&
        (!f.insurance || d.insurances.indexOf(f.insurance) !== -1);
    });
  }

  // Quote for a list of exam ids, insurance and coupon (never throws on user input).
  function computeQuote(examIds, insurance, coupon) {
    var q = new Quote();
    (examIds || []).forEach(function (id) { q.addExam(id); });
    var couponValid = false;
    if (coupon) couponValid = q.applyCoupon(coupon);
    var usesInsurance = !!insurance && insurance !== PARTICULAR;
    if (usesInsurance) q.setInsuranceCopay(DEFAULT_COPAY);
    var r = q.calculate();
    r.couponValid = couponValid;
    r.couponIgnored = couponValid && usesInsurance;
    return r;
  }

  function toggleExam(state, id) {
    var i = state.examIds.indexOf(id);
    if (i !== -1) { state.examIds.splice(i, 1); return true; }
    if (!Exams.find(id)) return false;
    state.examIds.push(id);
    return true;
  }

  function fastingHours(state) {
    return computeQuote(state.examIds, PARTICULAR, '').fastingHours;
  }

  function isTaken(state, doctorId, date, time) {
    return state.appointments.some(function (a) {
      return a.doctorId === doctorId && a.date === date && a.time === time;
    });
  }

  // Slots offered for a doctor/date; fasting exams restrict to early slots.
  function availableSlots(state, doctorId, date) {
    if (!isWeekday(date)) return [];
    var fasting = fastingHours(state) > 0;
    return SLOT_TIMES.filter(function (t) {
      return !isTaken(state, doctorId, date, t) && (!fasting || t < FASTING_CUTOFF);
    });
  }

  function updateDraft(state, patch) {
    var d = state.draft;
    Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    var doc = d.doctorId ? findDoctor(state, d.doctorId) : null;
    if (!doc) { d.doctorId = null; d.modality = null; }
    else if (!d.modality || doc.modalities.indexOf(d.modality) === -1) d.modality = doc.modalities[0];
    if (d.time && (!d.doctorId || availableSlots(state, d.doctorId, d.date).indexOf(d.time) === -1)) d.time = null;
    return d;
  }

  function findDoctor(state, id) {
    return state.catalog.getAllDoctors().filter(function (d) { return d.id === id; })[0] || null;
  }

  function validateDraft(state) {
    var d = state.draft;
    if (!d.doctorId) return 'no-doctor';
    var doc = findDoctor(state, d.doctorId);
    if (!doc) return 'unknown-doctor';
    if (doc.modalities.indexOf(d.modality) === -1) return 'bad-modality';
    if (!isWeekday(d.date)) return 'bad-date';
    if (!d.time || SLOT_TIMES.indexOf(d.time) === -1) return 'bad-slot';
    if (isTaken(state, d.doctorId, d.date, d.time)) return 'taken';
    if (fastingHours(state) > 0 && d.time >= FASTING_CUTOFF) return 'fasting-slot';
    return null;
  }

  // Combined view of the pending appointment and the selected exams.
  function buildSummary(state) {
    var d = state.draft;
    var doc = d.doctorId ? findDoctor(state, d.doctorId) : null;
    var quote = computeQuote(state.examIds, state.insurance, state.coupon);
    var exams = state.examIds.map(function (id) { return Exams.find(id); });
    var notes = [];
    if (quote.fastingHours > 0) notes.push('Jejum de ' + quote.fastingHours + 'h antes da coleta.');
    if (doc && d.modality === Doctors.modalities.TELECONSULTATION && exams.length) {
      notes.push('Teleconsulta: a coleta dos exames é feita presencialmente na clínica.');
    }
    if (quote.couponIgnored) notes.push('Cupom não acumula com convênio.');
    return {
      doctor: doc,
      modality: d.modality,
      date: d.date,
      time: d.time,
      exams: exams,
      quote: quote,
      resultsDate: exams.length && d.date ? addDays(d.date, quote.turnaroundDays) : null,
      notes: notes,
      error: validateDraft(state)
    };
  }

  function confirmAppointment(state) {
    var err = validateDraft(state);
    if (err) return { ok: false, reason: err, message: REASONS[err] };
    var s = buildSummary(state);
    var appt = {
      doctorId: s.doctor.id, doctorName: s.doctor.name, specialty: s.doctor.specialty,
      modality: s.modality, date: s.date, time: s.time, insurance: state.insurance,
      examIds: state.examIds.slice(), total: s.quote.total, resultsDate: s.resultsDate
    };
    state.appointments.push(appt);
    state.examIds = [];
    state.coupon = '';
    state.draft = { doctorId: null, modality: null, date: null, time: null };
    return { ok: true, appointment: appt };
  }

  function cancelAppointment(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.appointments.length) return false;
    state.appointments.splice(index, 1);
    return true;
  }

  // ---------------------------------------------------------------- DOM
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { el.addEventListener(ev, attrs.on[ev]); });
      else if (attrs[k] === true) el.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  function init() {
    var state = createState();
    var filters = { specialty: '', modality: '', insurance: '' };
    var VIEWS = ['consultas', 'exames', 'resumo'];
    var $ = function (id) { return document.getElementById(id); };
    var today = localISO(new Date());

    function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
    function say(id, text, ok) {
      var el = $(id); el.textContent = text || '';
      el.className = 'msg' + (ok ? ' ok' : '');
    }

    function showView(name) {
      if (VIEWS.indexOf(name) === -1) name = 'consultas';
      VIEWS.forEach(function (v) {
        var on = v === name;
        $('panel-' + v).hidden = !on;
        var tab = $('tab-' + v);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    }

    function fillSelect(sel, items, label) {
      clear(sel);
      sel.appendChild(h('option', { value: '', text: label }));
      items.forEach(function (v) { sel.appendChild(h('option', { value: v, text: v })); });
    }

    function renderDoctors() {
      var list = clear($('doctor-list'));
      var docs = filterDoctors(state.catalog, filters);
      $('doctor-count').textContent = docs.length + (docs.length === 1 ? ' médico' : ' médicos');
      docs.forEach(function (d) {
        var sel = state.draft.doctorId === d.id;
        list.appendChild(h('li', { class: 'card' + (sel ? ' selected' : '') }, [
          h('h3', { text: d.name }),
          h('p', { class: 'meta', text: d.specialty + ' · ' + d.crm }),
          h('p', { class: 'meta', text: d.modalities.join(' / ') }),
          h('p', { class: 'meta', text: 'Convênios: ' + d.insurances.join(', ') }),
          h('button', { type: 'button', class: sel ? 'primary' : '', 'aria-pressed': sel ? 'true' : 'false',
            text: sel ? 'Selecionado' : 'Selecionar',
            on: { click: function () { updateDraft(state, { doctorId: d.id }); renderAll(); } } })
        ]));
      });
      if (!docs.length) list.appendChild(h('li', { class: 'empty', text: 'Nenhum médico encontrado para esses filtros.' }));
    }

    function renderBooking() {
      var d = state.draft;
      var doc = d.doctorId ? findDoctor(state, d.doctorId) : null;
      var box = clear($('booking'));
      if (!doc) {
        box.appendChild(h('p', { class: 'hint', text: 'Selecione um médico para ver os horários.' }));
        return;
      }
      box.appendChild(h('p', { class: 'strong', text: doc.name + ' — ' + doc.specialty }));
      var mods = h('div', { class: 'chips', role: 'group', 'aria-label': 'Modalidade' });
      doc.modalities.forEach(function (m) {
        mods.appendChild(h('button', { type: 'button', class: 'chip', 'aria-pressed': d.modality === m ? 'true' : 'false', text: m,
          on: { click: function () { updateDraft(state, { modality: m }); renderAll(); } } }));
      });
      box.appendChild(mods);
      var dateInput = h('input', { id: 'appt-date', type: 'date', min: today, value: d.date || '',
        on: { change: function (e) { updateDraft(state, { date: e.target.value || null }); renderAll(); } } });
      box.appendChild(h('label', { for: 'appt-date', text: 'Data' }));
      box.appendChild(dateInput);
      var slots = h('div', { class: 'chips', role: 'group', 'aria-label': 'Horários' });
      var times = d.date ? availableSlots(state, doc.id, d.date) : [];
      times.forEach(function (t) {
        slots.appendChild(h('button', { type: 'button', class: 'chip', 'aria-pressed': d.time === t ? 'true' : 'false', text: t,
          on: { click: function () { updateDraft(state, { time: t }); renderAll(); } } }));
      });
      box.appendChild(slots);
      if (d.date && !isWeekday(d.date)) box.appendChild(h('p', { class: 'msg', text: REASONS['bad-date'] }));
      else if (d.date && !times.length) box.appendChild(h('p', { class: 'msg', text: 'Sem horários nesta data.' }));
      if (fastingHours(state) > 0) box.appendChild(h('p', { class: 'hint', text: 'Exames com jejum selecionados: horários apenas antes das 10:00.' }));
    }

    function renderExams() {
      [['lab-list', Exams.labExams()], ['checkup-list', Exams.checkups()]].forEach(function (g) {
        var list = clear($(g[0]));
        g[1].forEach(function (e) {
          var on = state.examIds.indexOf(e.id) !== -1;
          var meta = (e.fastingHours ? 'Jejum ' + e.fastingHours + 'h' : 'Sem jejum') + ' · Resultado em ' + e.turnaroundDays + 'd';
          var kids = [h('h3', { text: e.name }), h('p', { class: 'price', text: formatBRL(e.price) }), h('p', { class: 'meta', text: meta })];
          if (e.description) kids.push(h('p', { class: 'meta', text: e.description }));
          if (e.included) kids.push(h('p', { class: 'meta', text: 'Inclui: ' + e.included.map(function (i) { return Exams.find(i).name; }).join(', ') }));
          kids.push(h('button', { type: 'button', class: on ? 'primary' : '', 'aria-pressed': on ? 'true' : 'false', text: on ? 'Remover' : 'Adicionar',
            on: { click: function () { toggleExam(state, e.id); renderAll(); } } }));
          list.appendChild(h('li', { class: 'card' + (on ? ' selected' : '') }, kids));
        });
      });
    }

    function renderSummary() {
      var s = buildSummary(state);
      var box = clear($('summary'));
      var rows = [];
      rows.push(['Consulta', s.doctor ? s.doctor.name + ' (' + s.doctor.specialty + ')' : 'Nenhum médico selecionado']);
      rows.push(['Modalidade', s.modality || '—']);
      rows.push(['Data e hora', s.date && s.time ? formatDate(s.date) + ' às ' + s.time : 'A definir']);
      rows.push(['Exames', s.exams.length ? s.exams.map(function (e) { return e.name; }).join(', ') : 'Nenhum']);
      if (s.resultsDate) rows.push(['Resultados a partir de', formatDate(s.resultsDate)]);
      rows.push(['Subtotal', formatBRL(s.quote.subtotal)]);
      if (s.quote.discount > 0) rows.push(['Desconto', '-' + formatBRL(s.quote.discount)]);
      rows.push(['Total dos exames', formatBRL(s.quote.total)]);
      rows.forEach(function (r) {
        box.appendChild(h('dt', { text: r[0] }));
        box.appendChild(h('dd', { text: r[1] }));
      });
      var notes = clear($('summary-notes'));
      s.notes.forEach(function (n) { notes.appendChild(h('li', { text: n })); });
      if (!state.coupon) say('coupon-msg', '');
      else if (s.quote.couponValid) say('coupon-msg', 'Cupom aplicado: 10% de desconto.', true);
      else say('coupon-msg', 'Cupom inválido.');
    }

    function renderAppointments() {
      var list = clear($('appointments'));
      $('appt-count').textContent = String(state.appointments.length);
      state.appointments.forEach(function (a, i) {
        var exams = a.examIds.length ? ' · ' + a.examIds.length + ' exame(s), total ' + formatBRL(a.total) : '';
        list.appendChild(h('li', { class: 'card compact' }, [
          h('p', { class: 'strong', text: a.doctorName + ' — ' + formatDate(a.date) + ' ' + a.time }),
          h('p', { class: 'meta', text: a.specialty + ' · ' + a.modality + exams + (a.resultsDate ? ' · resultados em ' + formatDate(a.resultsDate) : '') }),
          h('button', { type: 'button', text: 'Cancelar', on: { click: function () { cancelAppointment(state, i); say('confirm-msg', 'Agendamento cancelado.'); renderAll(); } } })
        ]));
      });
      if (!state.appointments.length) list.appendChild(h('li', { class: 'empty', text: 'Nenhum agendamento.' }));
    }

    function renderAll() {
      renderDoctors(); renderBooking(); renderExams(); renderSummary(); renderAppointments();
      $('exam-count').textContent = String(state.examIds.length);
    }

    fillSelect($('f-specialty'), Object.keys(Doctors.specialties).map(function (k) { return Doctors.specialties[k]; }), 'Todas as especialidades');
    fillSelect($('f-modality'), Object.keys(Doctors.modalities).map(function (k) { return Doctors.modalities[k]; }), 'Todas as modalidades');
    fillSelect($('f-insurance'), Object.keys(Doctors.insurances).map(function (k) { return Doctors.insurances[k]; }), 'Todos os convênios');
    [['f-specialty', 'specialty'], ['f-modality', 'modality'], ['f-insurance', 'insurance']].forEach(function (p) {
      $(p[0]).addEventListener('change', function (e) { filters[p[1]] = e.target.value; renderDoctors(); });
    });

    var insSel = $('insurance');
    Object.keys(Doctors.insurances).forEach(function (k) {
      insSel.appendChild(h('option', { value: Doctors.insurances[k], text: Doctors.insurances[k] }));
    });
    insSel.addEventListener('change', function (e) { state.insurance = e.target.value; renderAll(); });
    $('coupon').addEventListener('input', function (e) { state.coupon = e.target.value; renderSummary(); });

    $('confirm').addEventListener('click', function () {
      var r = confirmAppointment(state);
      if (r.ok) {
        $('coupon').value = '';
        say('confirm-msg', 'Agendamento confirmado com ' + r.appointment.doctorName + ' em ' + formatDate(r.appointment.date) + ' às ' + r.appointment.time + '.', true);
      } else say('confirm-msg', r.message);
      renderAll();
    });

    VIEWS.forEach(function (v) {
      $('tab-' + v).addEventListener('click', function () { showView(v); });
    });
    window.addEventListener('hashchange', function () { showView(location.hash.slice(1)); });

    renderAll();
    showView(location.hash.slice(1));
  }

  var api = {
    formatBRL: formatBRL, parseISO: parseISO, isWeekday: isWeekday, addDays: addDays, formatDate: formatDate,
    seedCatalog: seedCatalog, createState: createState, filterDoctors: filterDoctors, computeQuote: computeQuote,
    toggleExam: toggleExam, availableSlots: availableSlots, updateDraft: updateDraft, validateDraft: validateDraft,
    buildSummary: buildSummary, confirmAppointment: confirmAppointment, cancelAppointment: cancelAppointment,
    SLOT_TIMES: SLOT_TIMES, init: init
  };

  if (isNode) module.exports = api;
  else {
    root.ClinicaApp = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : this);
