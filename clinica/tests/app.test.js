'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const App = require('../app.js');

const WED = '2030-01-02'; // Wednesday
const SAT = '2030-01-05';

function stateWithDoctor() {
  const s = App.createState();
  const doc = s.catalog.getAllDoctors()[0];
  App.updateDraft(s, { doctorId: doc.id, date: WED });
  return { s, doc };
}

test('formatBRL and date helpers', () => {
  assert.equal(App.formatBRL(1234.5), 'R$ 1.234,50');
  assert.equal(App.formatBRL(0), 'R$ 0,00');
  assert.equal(App.formatDate('2030-01-02'), '02/01/2030');
  assert.equal(App.addDays(WED, 3), '2030-01-05');
  assert.equal(App.addDays('2030-12-31', 1), '2031-01-01');
  assert.equal(App.addDays('bogus', 1), null);
  assert.equal(App.isWeekday(WED), true);
  assert.equal(App.isWeekday(SAT), false);
  assert.equal(App.isWeekday('2030-02-31'), false);
});

test('seed catalog covers every specialty and filters combine', () => {
  const s = App.createState();
  assert.equal(s.catalog.getAllDoctors().length, 6);
  const tele = App.filterDoctors(s.catalog, { modality: 'Teleconsulta' });
  assert.ok(tele.length >= 2 && tele.every((d) => d.modalities.includes('Teleconsulta')));
  const both = App.filterDoctors(s.catalog, { specialty: 'Cardiologia', insurance: 'Unimed' });
  assert.equal(both.length, 0);
  assert.equal(App.filterDoctors(s.catalog).length, 6);
});

test('updateDraft picks default modality and drops invalid selections', () => {
  const { s, doc } = stateWithDoctor();
  assert.equal(s.draft.modality, doc.modalities[0]);
  App.updateDraft(s, { time: '09:00' });
  assert.equal(s.draft.time, '09:00');
  App.updateDraft(s, { date: SAT });
  assert.equal(s.draft.time, null);
  App.updateDraft(s, { doctorId: 'nope' });
  assert.equal(s.draft.doctorId, null);
});

test('fasting exams restrict slots to before 10:00', () => {
  const { s, doc } = stateWithDoctor();
  assert.equal(App.availableSlots(s, doc.id, WED).length, App.SLOT_TIMES.length);
  App.toggleExam(s, 'hemograma');
  const slots = App.availableSlots(s, doc.id, WED);
  assert.ok(slots.length > 0 && slots.every((t) => t < '10:00'));
  App.toggleExam(s, 'vitamina_d'); // still fasting (hemograma)
  App.toggleExam(s, 'hemograma');
  assert.equal(App.availableSlots(s, doc.id, WED).length, App.SLOT_TIMES.length);
  assert.deepEqual(App.availableSlots(s, doc.id, SAT), []);
});

test('toggleExam adds, removes and rejects unknown ids', () => {
  const s = App.createState();
  assert.equal(App.toggleExam(s, 'tsh'), true);
  assert.deepEqual(s.examIds, ['tsh']);
  App.toggleExam(s, 'tsh');
  assert.deepEqual(s.examIds, []);
  assert.equal(App.toggleExam(s, 'x'), false);
});

test('computeQuote handles coupon, insurance and check-up coverage', () => {
  assert.equal(App.computeQuote(['hemograma', 'glicemia'], 'Particular', '').total, 40);
  const c = App.computeQuote(['hemograma', 'glicemia'], 'Particular', ' dansaude10 ');
  assert.equal(c.couponValid, true);
  assert.equal(c.total, 36);
  assert.equal(App.computeQuote(['hemograma'], 'Particular', 'FOO').couponValid, false);
  const ins = App.computeQuote(['hemograma'], 'Amil', 'DANSAUDE10');
  assert.equal(ins.discountType, 'convenio');
  assert.equal(ins.total, 7.5);
  assert.equal(ins.couponIgnored, true);
  const cov = App.computeQuote(['checkup_basico', 'hemograma'], 'Particular', '');
  assert.equal(cov.subtotal, 120);
});

test('buildSummary couples appointment and exams', () => {
  const { s, doc } = stateWithDoctor();
  App.toggleExam(s, 'colesterol'); // 2 days, 12h fasting
  App.updateDraft(s, { time: '08:00' });
  const sum = App.buildSummary(s);
  assert.equal(sum.doctor.id, doc.id);
  assert.equal(sum.resultsDate, '2030-01-04');
  assert.equal(sum.quote.total, 30);
  assert.equal(sum.error, null);
  assert.ok(sum.notes.some((n) => n.includes('12h')));
  App.updateDraft(s, { doctorId: doc.id, modality: 'Teleconsulta' });
  assert.ok(App.buildSummary(s).notes.some((n) => n.includes('presencialmente')));
});

test('validateDraft reports each failure reason', () => {
  const s = App.createState();
  assert.equal(App.validateDraft(s), 'no-doctor');
  const doc = s.catalog.getAllDoctors()[0];
  App.updateDraft(s, { doctorId: doc.id });
  assert.equal(App.validateDraft(s), 'bad-date');
  App.updateDraft(s, { date: WED });
  assert.equal(App.validateDraft(s), 'bad-slot');
  s.draft.time = '10:00';
  App.toggleExam(s, 'hemograma');
  assert.equal(App.validateDraft(s), 'fasting-slot');
  s.draft.modality = 'Inexistente';
  assert.equal(App.validateDraft(s), 'bad-modality');
});

test('confirmAppointment stores booking, resets draft and blocks double booking', () => {
  const { s, doc } = stateWithDoctor();
  App.toggleExam(s, 'hemograma');
  App.updateDraft(s, { time: '08:00' });
  const r = App.confirmAppointment(s);
  assert.equal(r.ok, true);
  assert.equal(s.appointments.length, 1);
  assert.equal(s.appointments[0].total, 25);
  assert.deepEqual(s.examIds, []);
  assert.equal(s.draft.doctorId, null);
  App.updateDraft(s, { doctorId: doc.id, date: WED, time: '08:00' });
  assert.equal(s.draft.time, null); // taken slot cleared
  s.draft.time = '08:00';
  const again = App.confirmAppointment(s);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'taken');
  assert.equal(App.confirmAppointment(App.createState()).reason, 'no-doctor');
});

test('cancelAppointment frees the slot and validates index', () => {
  const { s, doc } = stateWithDoctor();
  App.updateDraft(s, { time: '09:00' });
  App.confirmAppointment(s);
  assert.equal(App.cancelAppointment(s, 5), false);
  assert.equal(App.cancelAppointment(s, 0), true);
  assert.ok(App.availableSlots(s, doc.id, WED).includes('09:00'));
});

test('index.html wires the SPA views and stays light-only', () => {
  const dir = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
  assert.match(css, /color-scheme:\s*only light;/);
  assert.match(html, /<meta name="color-scheme" content="only light">/);
  assert.doesNotMatch(css + html, /prefers-color-scheme|data-theme/);
  ['consultas', 'exames', 'resumo'].forEach((v) => {
    assert.ok(html.includes('id="panel-' + v + '"'), v);
    assert.ok(html.includes('id="tab-' + v + '"'), v);
  });
  ['exams.js', 'quote.js', 'doctors.js', 'app.js'].forEach((f) => assert.ok(html.includes('src="' + f + '"'), f));
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});
