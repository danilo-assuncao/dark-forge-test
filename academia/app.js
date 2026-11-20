/* Dan Fit Club SPA: wires classes.js, plans.js, billing.js and schedule.js into
   a class timetable and an enrollment simulator. Pure view-model helpers are
   exported for Node tests; the DOM is only touched by init(). */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var Classes = isNode ? require('./classes.js') : root.AcademiaClasses;
  var Plans = isNode ? require('./plans.js') : root.DanFitPlans;
  var Billing = isNode ? require('./billing.js') : root.DanFitBilling;
  var Sched = isNode ? require('./schedule.js') : root.AcademiaSchedule;

  // Demo occupancy so some sessions show limited seats / waitlists.
  var DEMO_OCCUPANCY = { 'sp-seg-1830': 25, 'bx-ter-1900': 15, 'ff-qua-1800': 12 };
  var DEMO_WAITING = { 'sp-seg-1830': 2 };

  var REASONS = {
    'unknown-slot': 'Aula não encontrada.',
    'already-booked': 'Você já está inscrito nesta aula.',
    'already-waitlisted': 'Você já está na lista de espera.',
    'conflict': 'Conflito de horário com outra aula sua.',
    'invalid-occupancy': 'Não foi possível verificar as vagas.',
    'not-found': 'Reserva não encontrada.'
  };
  var COUPON_REASONS = {
    unknown: 'Cupom inválido.',
    cycle_not_eligible: 'Cupom válido apenas nos planos Semestral e Anual.',
    invalid_cycle: 'Ciclo inválido.'
  };

  function formatBRL(cents) {
    var abs = Math.abs(Math.round(cents));
    var reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (cents < 0 ? '-' : '') + 'R$ ' + reais + ',' + ('0' + (abs % 100)).slice(-2);
  }

  // Rows for one weekday of the timetable.
  function dayRows(schedule, day) {
    return Sched.slotsForDay(day).map(function (s) {
      var c = Classes.getClass(s.classId);
      var inst = Classes.getInstructor(s.instructorId);
      var booked = schedule.isBooked(s.id);
      var waitlisted = schedule.isWaitlisted(s.id);
      var left = schedule.seatsLeft(s.id);
      var status = booked ? 'booked' : waitlisted ? 'waitlisted' : left === 0 ? 'full' : 'open';
      return {
        id: s.id,
        title: c.name,
        time: s.start + ' – ' + Sched.endTime(s),
        instructor: inst ? inst.name : '',
        calories: c.caloriesPerSession,
        intensity: (Classes.getIntensity(c.intensity) || {}).name || '',
        seatsLeft: left,
        status: status,
        position: waitlisted ? schedule.waitlistPosition(s.id) : null
      };
    });
  }

  function rowLabel(row) {
    if (row.status === 'booked') return 'Cancelar';
    if (row.status === 'waitlisted') return 'Sair da lista';
    return row.status === 'full' ? 'Entrar na lista de espera' : 'Reservar';
  }

  function toggleSlot(schedule, row) {
    var res = row.status === 'booked' || row.status === 'waitlisted'
      ? schedule.cancel(row.id) : schedule.book(row.id);
    var msg;
    if (!res.ok) msg = REASONS[res.reason] || 'Não foi possível concluir.';
    else if (res.status === 'booked') msg = 'Aula reservada!';
    else if (res.status === 'waitlisted') msg = 'Aula lotada: você é o nº ' + res.position + ' na lista de espera.';
    else if (res.status === 'cancelled') msg = 'Reserva cancelada.';
    else msg = 'Você saiu da lista de espera.';
    return { ok: res.ok, message: msg };
  }

  // Quote for the enrollment form; an invalid coupon never blocks the quote.
  function buildQuote(planId, cycleId, coupon) {
    var q = Billing.simulate(planId, cycleId, coupon);
    var lines = [
      ['Preço de tabela', formatBRL(q.listCents)],
      ['Desconto do ciclo', '-' + formatBRL(q.cycleDiscountCents)]
    ];
    if (q.couponCode) lines.push(['Cupom ' + q.couponCode, '-' + formatBRL(q.couponDiscountCents)]);
    lines.push(['Total', formatBRL(q.totalCents)],
      ['Mensalidade líquida', formatBRL(q.netMonthlyCents)],
      ['Economia vs. mensal', formatBRL(q.savingsCents)]);
    return {
      quote: q,
      couponMessage: q.couponError ? (COUPON_REASONS[q.couponError] || 'Cupom inválido.') : '',
      lines: lines
    };
  }

  function enroll(planId, cycleId, coupon, rng) {
    var q = buildQuote(planId, cycleId, coupon);
    var protocol = Billing.generateProtocol(rng);
    return {
      protocol: protocol,
      quote: q.quote,
      message: 'Matrícula confirmada! Protocolo ' + protocol + ' – total ' + formatBRL(q.quote.totalCents) + '.'
    };
  }

  function el(doc, tag, text, cls) {
    var n = doc.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  function seatsBadge(n) { return n === 1 ? '1 vaga' : n + ' vagas'; }

  // opts.day: weekday to show first (0-6, defaults to today);
  // opts.occupancy / opts.waiting: override the demo data.
  function init(doc, storage, opts) {
    opts = opts || {};
    var schedule = Sched.createSchedule(storage, {
      occupancy: opts.occupancy || DEMO_OCCUPANCY,
      waiting: opts.waiting || DEMO_WAITING
    });
    var state = { day: opts.day != null ? opts.day : new Date().getDay(), plan: 'plus', cycle: 'semestral' };
    var $ = function (id) { return doc.getElementById(id); };
    var pendingKey = null;
    var toFocus = null;

    // Focus is restored to the control with the same key after a re-render.
    function beginRender() {
      var a = doc.activeElement;
      pendingKey = a && a.getAttribute ? a.getAttribute('data-focus') : null;
      toFocus = null;
    }
    function mark(node, key) {
      node.setAttribute('data-focus', key);
      if (key === pendingKey) toFocus = node;
    }
    function endRender() { if (toFocus) toFocus.focus(); }

    function renderSchedule() {
      beginRender();
      var picker = $('day-picker');
      picker.textContent = '';
      Sched.DAYS.forEach(function (d) {
        var b = el(doc, 'button', d.name);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(d.id === state.day));
        mark(b, 'day-' + d.id);
        b.addEventListener('click', function () { state.day = d.id; $('schedule-msg').textContent = ''; renderSchedule(); });
        picker.appendChild(b);
      });
      var list = $('slot-list');
      list.textContent = '';
      var rows = dayRows(schedule, state.day);
      if (!rows.length) list.appendChild(el(doc, 'li', 'Sem aulas neste dia.', 'card'));
      rows.forEach(function (r) {
        var li = el(doc, 'li', null, 'card');
        li.appendChild(el(doc, 'h4', r.title));
        li.appendChild(el(doc, 'p', r.time + ' · ' + r.instructor, 'meta'));
        li.appendChild(el(doc, 'p', 'Intensidade ' + r.intensity + ' · ~' + r.calories + ' kcal', 'meta'));
        var badge = r.status === 'booked' ? 'Reservada'
          : r.status === 'waitlisted' ? 'Lista de espera nº ' + r.position
          : r.status === 'full' ? 'Lotada' : seatsBadge(r.seatsLeft);
        li.appendChild(el(doc, 'span', badge, 'badge'));
        var b = el(doc, 'button', rowLabel(r));
        b.type = 'button';
        mark(b, 'slot-' + r.id);
        b.addEventListener('click', function () {
          var res = toggleSlot(schedule, r);
          renderSchedule();
          var m = $('schedule-msg');
          m.textContent = res.message;
          m.className = 'msg' + (res.ok ? ' ok' : '');
        });
        li.appendChild(b);
        list.appendChild(li);
      });
      var mine = $('my-bookings');
      mine.textContent = '';
      var all = schedule.listBookings().map(function (s) { return [s, 'Confirmada']; })
        .concat(schedule.listWaitlist().map(function (s) { return [s, 'Em espera']; }));
      if (!all.length) mine.appendChild(el(doc, 'li', 'Nenhuma aula reservada.', 'card'));
      all.forEach(function (p) {
        var s = p[0];
        mine.appendChild(el(doc, 'li', Sched.DAYS[s.day].name + ' ' + s.start + ' – ' +
          Classes.getClass(s.classId).name + ' (' + p[1] + ')', 'card'));
      });
      endRender();
    }

    function renderPlans() {
      beginRender();
      var cp = $('cycle-picker');
      cp.textContent = '';
      Plans.listCycles().forEach(function (c) {
        var b = el(doc, 'button', c.label + (c.discountPct ? ' −' + c.discountPct + '%' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(c.id === state.cycle));
        mark(b, 'cycle-' + c.id);
        b.addEventListener('click', function () { state.cycle = c.id; renderPlans(); });
        cp.appendChild(b);
      });
      var pl = $('plan-list');
      pl.textContent = '';
      Plans.listPlans().forEach(function (p) {
        var q = Billing.simulate(p.id, state.cycle, '');
        var li = el(doc, 'li', null, 'card' + (p.id === state.plan ? ' selected' : ''));
        li.appendChild(el(doc, 'h4', p.name));
        li.appendChild(el(doc, 'p', formatBRL(q.netMonthlyCents) + '/mês', 'price'));
        var ul = el(doc, 'ul');
        p.benefits.forEach(function (t) { ul.appendChild(el(doc, 'li', t)); });
        li.appendChild(ul);
        var b = el(doc, 'button', p.id === state.plan ? 'Selecionado' : 'Selecionar');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(p.id === state.plan));
        mark(b, 'plan-' + p.id);
        b.addEventListener('click', function () { state.plan = p.id; renderPlans(); });
        li.appendChild(b);
        pl.appendChild(li);
      });
      renderQuote();
      endRender();
    }

    function renderQuote() {
      $('enroll-msg').textContent = ''; // a confirmation never outlives its quote
      var q = buildQuote(state.plan, state.cycle, $('coupon').value);
      $('enroll-summary').textContent = Plans.getPlan(state.plan).name + ' · ' + Plans.getCycle(state.cycle).label;
      $('coupon-msg').textContent = q.couponMessage;
      var dl = $('quote');
      dl.textContent = '';
      q.lines.forEach(function (l) {
        dl.appendChild(el(doc, 'dt', l[0]));
        dl.appendChild(el(doc, 'dd', l[1]));
      });
    }

    $('coupon').addEventListener('input', renderQuote);
    $('enroll-form').addEventListener('submit', function (e) {
      e.preventDefault();
      $('enroll-msg').textContent = enroll(state.plan, state.cycle, $('coupon').value).message;
    });

    var tabs = Array.prototype.slice.call(doc.querySelectorAll('[data-tab]'));
    function activateTab(t, focus) {
      tabs.forEach(function (o) {
        var on = o === t;
        o.setAttribute('aria-selected', String(on));
        o.tabIndex = on ? 0 : -1;
        $('panel-' + o.getAttribute('data-tab')).hidden = !on;
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activateTab(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, k = e.key, target = null;
        if (k === 'ArrowRight') target = tabs[(i + 1) % n];
        else if (k === 'ArrowLeft') target = tabs[(i - 1 + n) % n];
        else if (k === 'Home') target = tabs[0];
        else if (k === 'End') target = tabs[n - 1];
        if (!target) return;
        e.preventDefault();
        activateTab(target, true);
      });
    });

    renderSchedule();
    renderPlans();
  }

  var api = {
    formatBRL: formatBRL, dayRows: dayRows, rowLabel: rowLabel, toggleSlot: toggleSlot,
    buildQuote: buildQuote, enroll: enroll, init: init,
    DEMO_OCCUPANCY: DEMO_OCCUPANCY, DEMO_WAITING: DEMO_WAITING
  };

  if (isNode) module.exports = api;
  else {
    root.DanFitApp = api;
    if (root.document) {
      if (root.document.readyState === 'loading') {
        root.document.addEventListener('DOMContentLoaded', function () { init(root.document); });
      } else init(root.document);
    }
  }
})(typeof window !== 'undefined' ? window : this);
