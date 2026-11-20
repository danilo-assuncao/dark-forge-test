'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBooking, createReservation, init } = require('../app.js');
const base = { roomId: 'standard', guests: 2, checkInIso: '2026-06-30', checkOutIso: '2026-07-02', couponCode: ' danstay10 ', addonIds: ['breakfast', 'airport-transfer'] };

test('combines seasonal nights, coupon, ISS and concierge without discounting extras', () => {
  const result = calculateBooking(base);
  assert.deepEqual(result.stay.nightlyRates, [320, 400]);
  assert.equal(result.stay.couponDiscount, 72);
  assert.equal(result.stay.iss, 32.4);
  assert.equal(result.extras.total, 332);
  assert.equal(result.total, 1012.4);
});

test('long stays stack discounts and all concierge pricing modes reconcile', () => {
  const result = calculateBooking({ ...base, checkInIso: '2026-03-01', checkOutIso: '2026-03-06', addonIds: ['breakfast', 'airport-transfer', 'spa-access', 'late-checkout'] });
  assert.equal(result.stay.longStayDiscount, 128);
  assert.equal(result.stay.couponDiscount, 147.2);
  assert.equal(result.extras.total, 920);
  assert.equal(result.total, 2311.04);
});

test('reservation validates input and returns a formatted reference and current total', () => {
  const reservation = createReservation(base);
  assert.match(reservation.code, /^HTL-[0-9A-F]{4}$/);
  assert.equal(reservation.total, 1012.4);
  
  const baseNoAddons = { ...base };
  delete baseNoAddons.addonIds;
  const noAddonsQuote = calculateBooking(baseNoAddons);
  assert.equal(noAddonsQuote.extras.total, 0);

  for (const overrides of [{ guests: 3 }, { checkOutIso: base.checkInIso }, { checkInIso: '2026-02-30' }, { checkOutIso: '2026-08-01' }, { addonIds: ['unknown'] }]) {
    assert.throws(() => createReservation({ ...base, ...overrides }), RangeError);
  }
});

// Minimal DOM harness exercises event handlers without adding runtime dependencies.
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.events = {}; this.value = ''; this.checked = false; this.hidden = false; this.text = ''; }
  set innerHTML(_) { throw new Error('innerHTML is forbidden. Use textContent or DOM nodes.'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ''; this.children = children; }
  addEventListener(name, handler) { (this.events[name] ||= []).push(handler); }
  fire(name) { (this.events[name] || []).forEach(handler => handler({ preventDefault() {} })); }
  focus() { this.focused = true; }
}
function setup() {
  const ids = ['booking-form', 'guests', 'rooms', 'addons', 'confirm', 'confirmation', 'room-status', 'check-in', 'check-out', 'coupon', 'coupon-status', 'quote', 'error'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  elements.guests.value = '2';
  init({ getElementById: id => elements[id], createElement: tag => new Element(tag) });
  const set = (id, value) => { elements[id].value = value; elements[id].fire('input'); };
  return { elements, set };
}

test('browser bootstrap path exports to globalThis and calls init', () => {
  const globalObj = {
    document: { getElementById: () => new Element(), createElement: tag => new Element(tag) },
    HotelRooms: { listRooms: () => [] },
    HotelPricing: {},
    HotelAddons: { listAddons: () => [] },
    Intl: { NumberFormat: class { format(v) { return String(v); } } }
  };
  require('node:vm').runInNewContext(`
    const module = undefined;
    ${require('node:fs').readFileSync('./hotel/app.js', 'utf8')}
  `, globalObj);
  assert.ok(globalObj.HotelApp.init);
  assert.ok(globalObj.HotelApp.calculateBooking);
});

test('DOM filters suites, handles empty results and recovers after invalid input', () => {
  const { elements: el, set } = setup();
  assert.equal(el.rooms.children.length, 4);
  assert.equal(el.confirm.disabled, true);
  set('guests', '4');
  assert.deepEqual(el.rooms.children.map(label => label.children[0].value), ['family', 'presidential']);
  set('guests', '5');
  assert.equal(el.rooms.children.length, 0);
  assert.equal(el.confirm.disabled, true);
  assert.match(el['room-status'].textContent, /Nenhuma/);
  set('guests', '1.5');
  assert.match(el.error.textContent, /inteira/);
  
  for (const invalid of ['', '0', '-1']) {
    set('guests', invalid);
    assert.equal(el.confirm.disabled, true);
    assert.match(el.error.textContent, /inteira/);
  }

  set('guests', '2');
  set('check-in', base.checkInIso);
  set('check-out', base.checkOutIso);
  assert.equal(el.confirm.disabled, false);
  set('check-out', base.checkInIso);
  assert.equal(el.confirm.disabled, true);
  assert.equal(el.quote.textContent, '');
});

test('DOM maintains room fallback and handles addon unchecking', () => {
  const { elements: el, set } = setup();
  set('check-in', base.checkInIso);
  set('check-out', base.checkOutIso);
  
  // Select an addon
  const breakfastInput = el.addons.children[0].children[0];
  breakfastInput.checked = true;
  breakfastInput.fire('change');
  
  // Change guests to force a re-render
  set('guests', '4');
  
  // Assert fallback to first available suite (family)
  const firstAvailable = el.rooms.children[0].children[0];
  assert.equal(firstAvailable.value, 'family');
  assert.equal(firstAvailable.checked, true);
  
  // Assert addon is still selected
  assert.match(el.quote.textContent, /Cafe da manha/i);
  
  // Uncheck addon
  breakfastInput.checked = false;
  breakfastInput.fire('change');
  assert.doesNotMatch(el.quote.textContent, /Cafe da manha/i);
});

test('DOM updates extras and coupon, confirms current selection, and clears stale confirmations', () => {
  const { elements: el, set } = setup();
  set('check-in', base.checkInIso);
  set('check-out', base.checkOutIso);
  set('coupon', 'danstay10');
  assert.match(el['coupon-status'].textContent, /aplicado/i);
  for (const label of el.addons.children.slice(0, 2)) {
    const input = label.children[0]; input.checked = true; input.fire('change');
  }
  assert.match(el.quote.textContent, /1\.012,40/);
  el['booking-form'].fire('submit');
  assert.equal(el.confirmation.hidden, false);
  assert.equal(el.confirmation.focused, true);
  assert.match(el.confirmation.textContent, /HTL-[0-9A-F]{4}/);
  assert.match(el.confirmation.textContent, /1\.012,40/);
  const deluxe = el.rooms.children[1].children[0];
  deluxe.checked = true; deluxe.fire('change');
  assert.equal(el.confirmation.hidden, true);
  el['booking-form'].fire('submit');
  assert.match(el.confirmation.textContent, /Suite Deluxe/);
  set('coupon', '<img src=x onerror=alert(1)>');
  assert.match(el['coupon-status'].textContent, /não reconhecido/);
  assert.equal(el.confirmation.hidden, true);
  set('check-out', '');
  el['booking-form'].fire('submit');
  assert.equal(el.confirmation.hidden, true);
});
