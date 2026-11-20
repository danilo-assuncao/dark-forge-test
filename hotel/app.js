(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const rooms = node ? require('./rooms.js') : root.HotelRooms;
  const pricing = node ? require('./pricing.js') : root.HotelPricing;
  const addons = node ? require('./addons.js') : root.HotelAddons;
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  function calculateBooking(input) {
    const stay = pricing.calculateStayPrice(input);
    const extras = addons.calculateAddonsTotal(input.addonIds || [], { nights: stay.nights, guests: stay.guests });
    return { stay, extras, total: (Math.round(stay.total * 100) + extras.totalCents) / 100 };
  }

  function createReservation(input) {
    const quote = calculateBooking(input);
    const bytes = new Uint16Array(1);
    root.crypto.getRandomValues(bytes);
    return { ...quote, code: 'HTL-' + bytes[0].toString(16).toUpperCase().padStart(4, '0') };
  }

  function init(doc) {
    const byId = id => doc.getElementById(id);
    const form = byId('booking-form');
    const guests = byId('guests');
    const roomContainer = byId('rooms');
    const addonContainer = byId('addons');
    const confirm = byId('confirm');
    const confirmation = byId('confirmation');
    let selectedRoom = '';
    const selectedAddons = new Set();
    function element(tag, text) {
      const el = doc.createElement(tag);
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function choice(container, type, id, name, detail, checked, onChange) {
      const label = element('label');
      label.className = 'choice';
      const input = element('input');
      input.type = type;
      input.name = type === 'radio' ? 'room' : 'addon';
      input.value = id;
      input.checked = checked;
      const description = element('span', name);
      description.append(element('small', detail));
      label.append(input, description);
      container.append(label);
      input.addEventListener('change', () => { onChange(input.checked); update(); });
    }
    function renderRooms() {
      roomContainer.replaceChildren();
      let available = [];
      try { available = rooms.listRooms({ minGuests: Number(guests.value) }); } catch (_) { /* Invalid guest field is explained below. */ }
      if (!available.some(room => room.id === selectedRoom)) selectedRoom = available.length ? available[0].id : '';
      available.forEach(room => choice(roomContainer, 'radio', room.id, room.name,
        `Até ${room.maxGuests} hóspedes · diária base ${money(room.dailyRate)}`, room.id === selectedRoom,
        () => { selectedRoom = room.id; }));
      byId('room-status').textContent = available.length ? `${available.length} suítes para sua busca.` : 'Nenhuma suíte disponível para essa quantidade de hóspedes.';
    }
    addons.listAddons().forEach(addon => {
      const unit = { 'per-guest-night': 'por hóspede / noite', 'per-guest': 'por hóspede', flat: 'por reserva' }[addon.pricing];
      choice(addonContainer, 'checkbox', addon.id, addon.name, `${money(addon.price)} ${unit}`, false,
        checked => { if (checked) selectedAddons.add(addon.id); else selectedAddons.delete(addon.id); });
    });
    function read() {
      return { roomId: selectedRoom, guests: Number(guests.value), checkInIso: byId('check-in').value,
        checkOutIso: byId('check-out').value, couponCode: byId('coupon').value, addonIds: [...selectedAddons] };
    }
    function update() {
      confirmation.hidden = true;
      confirmation.replaceChildren();
      confirm.disabled = true;
      byId('quote').replaceChildren();
      const input = read();
      const coupon = input.couponCode.trim().toUpperCase();
      byId('coupon-status').textContent = '';
      if (!Number.isInteger(input.guests) || input.guests < 1) {
        byId('error').textContent = 'Informe uma quantidade inteira de hóspedes (mínimo 1).';
        return;
      }
      if (!selectedRoom) {
        byId('error').textContent = 'Nenhuma suíte disponível para essa quantidade de hóspedes.';
        return;
      }
      if (!input.checkInIso || !input.checkOutIso) {
        byId('error').textContent = 'Selecione as datas de check-in e check-out.';
        return;
      }
      try {
        const quote = calculateBooking(input);
        byId('coupon-status').textContent = !coupon ? 'Use DANSTAY10 para 10% de desconto na hospedagem.'
          : coupon === 'DANSTAY10' ? 'Cupom DANSTAY10 aplicado à hospedagem.' : 'Cupom não reconhecido. Nenhum desconto de cupom aplicado.';
        const dl = element('dl');
        const lines = [
          [`Hospedagem · ${quote.stay.nights} noite(s)`, quote.stay.baseTotal],
          ['Desconto de longa estadia', -quote.stay.longStayDiscount],
          ['Desconto do cupom', -quote.stay.couponDiscount], ['ISS · 5%', quote.stay.iss]
        ];
        quote.extras.lines.forEach(line => {
          const addon = addons.listAddons().find(item => item.id === line.id);
          lines.push([`${addon.name} × ${line.quantity}`, line.subtotalCents / 100]);
        });
        lines.push(['Total', quote.total]);
        lines.forEach(([label, amount], index) => {
          const row = element('div');
          row.className = index === lines.length - 1 ? 'line total' : 'line';
          row.append(element('dt', label), element('dd', money(amount === 0 ? 0 : amount)));
          dl.append(row);
        });
        byId('quote').append(dl);
        byId('error').textContent = '';
        confirm.disabled = false;
      } catch (_) {
        byId('error').textContent = 'Confira as datas: o check-out deve ser após o check-in, com estadia de 1 a 30 noites.';
      }
    }
    guests.addEventListener('input', () => { renderRooms(); update(); });
    ['check-in', 'check-out', 'coupon'].forEach(id => byId(id).addEventListener('input', update));
    form.addEventListener('submit', event => {
      event.preventDefault();
      update();
      if (confirm.disabled) return;
      const input = read();
      const reservation = createReservation(input);
      confirmation.append(element('h2', `Reserva confirmada · ${reservation.code}`),
        element('p', `${rooms.getRoomById(input.roomId).name} · ${input.guests} hóspede(s) · ${input.checkInIso} a ${input.checkOutIso} · ${reservation.stay.nights} noite(s)`),
        element('p', `Total com concierge e ISS: ${money(reservation.total)}`),
        element('p', 'Confirmação desta simulação local. Nenhuma cobrança ou reserva externa foi realizada.'));
      confirmation.hidden = false;
      confirmation.focus();
    });
    renderRooms();
    update();
  }
  const api = { calculateBooking, createReservation, init };
  if (node) module.exports = api;
  else { root.HotelApp = api; init(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
