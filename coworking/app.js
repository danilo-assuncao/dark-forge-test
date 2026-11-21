'use strict';

const isNode = typeof window === 'undefined';
const spacesAPI = isNode ? require('./spaces.js') : window.spacesAPI;
const bookingsAPI = isNode ? require('./bookings.js') : window.bookingsAPI;
const amenitiesAPI = isNode ? require('./amenities.js') : window.amenitiesAPI;

const scheduler = bookingsAPI.createBookingScheduler();

function formatBRL(amount) {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function checkConflict(spaceId, dateIso, startHour, endHour) {
  const bookings = scheduler.listBookingsForDate(dateIso);
  return bookings.some(b => b.spaceId === spaceId && startHour < b.endHour && endHour > b.startHour);
}

function generatePass() {
  return 'HUB-' + Math.floor(1000 + Math.random() * 9000);
}

function renderSpaces(doc, state) {
  const list = doc.getElementById('spaces-list');
  list.textContent = '';
  
  if (!state.dateIso) return;
  
  if (state.startHour >= state.endHour) {
    list.textContent = 'Horário inválido. O início deve ser menor que o fim.';
    return;
  }

  const spaces = spacesAPI.listSpaces({ minCapacity: state.attendees });
  if (spaces.length === 0) {
    list.textContent = 'Nenhum espaço disponível para essa capacidade.';
    return;
  }

  spaces.forEach(space => {
    const card = doc.createElement('div');
    card.className = 'space-card';
    
    const isConflict = checkConflict(space.id, state.dateIso, state.startHour, state.endHour);
    
    const title = doc.createElement('h3');
    title.textContent = space.name;
    card.appendChild(title);
    
    if (isConflict) {
      card.classList.add('conflict');
      const msg = doc.createElement('p');
      msg.textContent = 'Indisponível: Conflito na agenda';
      msg.className = 'conflict-msg';
      card.appendChild(msg);
    } else {
      let quote;
      try {
        quote = scheduler.quoteSlot({
          spaceId: space.id,
          dateIso: state.dateIso,
          startHour: state.startHour,
          endHour: state.endHour,
          attendees: state.attendees
        });
      } catch (err) {
        const p = doc.createElement('p');
        p.textContent = err.message;
        card.appendChild(p);
        list.appendChild(card);
        return;
      }
      
      const order = amenitiesAPI.calculateWorkspaceOrder({
        slotSubtotalBrl: quote.price,
        amenityIds: state.amenityIds,
        attendees: state.attendees,
        couponCode: state.couponCode
      });
      
      const priceText = doc.createElement('p');
      priceText.textContent = `Total: ${formatBRL(order.total)}` + (order.discount > 0 ? ` (Desconto: ${formatBRL(order.discount)})` : '');
      card.appendChild(priceText);
      
      const btn = doc.createElement('button');
      btn.textContent = 'Reservar';
      btn.addEventListener('click', () => {
        try {
          scheduler.bookSlot({
            spaceId: space.id,
            dateIso: state.dateIso,
            startHour: state.startHour,
            endHour: state.endHour,
            attendees: state.attendees
          });
          const success = doc.getElementById('success-msg');
          success.textContent = `Reserva confirmada! Passe: ${generatePass()}`;
          success.className = 'success';
          renderSpaces(doc, state); // re-render to show conflict
        } catch (e) {
          alert('Erro ao reservar: ' + e.message);
        }
      });
      card.appendChild(btn);
    }
    
    list.appendChild(card);
  });
}

function init(doc) {
  const form = doc.getElementById('filter-form');
  if (!form) return;

  const dateInput = doc.getElementById('date-input');
  const attendeesInput = doc.getElementById('attendees-input');
  const startInput = doc.getElementById('start-input');
  const endInput = doc.getElementById('end-input');
  const couponInput = doc.getElementById('coupon-input');
  const amenitiesContainer = doc.getElementById('amenities-container');
  
  // Populate amenities
  const amenities = amenitiesAPI.listAmenities();
  amenities.forEach(am => {
    const label = doc.createElement('label');
    const cb = doc.createElement('input');
    cb.type = 'checkbox';
    cb.value = am.id;
    cb.className = 'amenity-cb';
    label.appendChild(cb);
    label.appendChild(doc.createTextNode(` ${am.id} (+${formatBRL(am.price)})`));
    amenitiesContainer.appendChild(label);
  });
  
  function getState() {
    const checkboxes = Array.from(doc.querySelectorAll('.amenity-cb'));
    const amenityIds = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    
    return {
      dateIso: dateInput.value,
      attendees: parseInt(attendeesInput.value, 10) || 1,
      startHour: parseInt(startInput.value, 10) || 8,
      endHour: parseInt(endInput.value, 10) || 9,
      couponCode: couponInput.value.trim(),
      amenityIds
    };
  }

  function update() {
    const successMsg = doc.getElementById('success-msg');
    successMsg.textContent = '';
    successMsg.className = '';
    const state = getState();
    if (state.dateIso) {
      renderSpaces(doc, state);
    }
  }

  form.addEventListener('change', update);
  form.addEventListener('submit', e => {
    e.preventDefault();
    update();
  });
}

const App = { init, scheduler, renderSpaces };

if (isNode) {
  module.exports = App;
} else {
  window.CoworkingApp = App;
  window.addEventListener('DOMContentLoaded', () => {
    App.init(document);
  });
}
