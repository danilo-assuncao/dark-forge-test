'use strict';

const { listMovies, SESSIONS } = require('./movies.js');
const { createSeatMap, ROWS, COLUMNS } = require('./seats.js');
const { listSnacks } = require('./snacks.js');
const { buildCinemaOrder } = require('./checkout.js');

const globalOccupiedSeats = {};

function el(tag, textOrProps = {}, children = []) {
  const element = document.createElement(tag);
  if (typeof textOrProps === 'string') {
    element.textContent = textOrProps;
  } else {
    for (const [key, value] of Object.entries(textOrProps)) {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'checked') {
        if (value) element.checked = true;
      } else if (key === 'selected') {
        if (value) element.selected = true;
      } else {
        element.setAttribute(key, value);
      }
    }
  }
  for (const child of children) {
    if (child) element.appendChild(child);
  }
  return element;
}

function initApp(rootElement) {
  let state = {
    genreFilter: '',
    ratingFilter: '16',
    selectedMovieId: null,
    selectedSessionId: null,
    seatMapObj: null,
    seats: [], 
    ticketKindSelector: 'full',
    snacks: [], 
    buyerName: '',
    couponCode: '',
    voucher: null,
    error: null
  };

  function update() {
    rootElement.textContent = ''; 
    rootElement.appendChild(render());
  }

  function render() {
    const container = el('div', { className: 'container' });
    container.appendChild(el('h1', 'Dan Cineplex'));

    if (state.error) {
      container.appendChild(el('div', { className: 'error', textContent: state.error }));
    }
    if (state.voucher) {
      container.appendChild(renderVoucher());
      container.appendChild(el('button', { textContent: 'Nova Compra', onClick: () => {
        state = { genreFilter: '', ratingFilter: '16', selectedMovieId: null, selectedSessionId: null, seatMapObj: null, seats: [], ticketKindSelector: 'full', snacks: [], buyerName: '', couponCode: '', voucher: null, error: null };
        update();
      } }));
      return container;
    }

    container.appendChild(renderFilters());
    container.appendChild(renderMovies());

    if (state.selectedMovieId) {
      container.appendChild(renderSessions());
    }

    if (state.selectedSessionId && state.seatMapObj) {
      container.appendChild(renderSeats());
      container.appendChild(renderSnacks());
      container.appendChild(renderCheckout());
    }

    return container;
  }

  function renderFilters() {
    const genreInput = el('input', { type: 'text', placeholder: 'Gênero', value: state.genreFilter, onInput: (e) => {
      state.genreFilter = e.target.value;
      state.selectedMovieId = null;
      state.selectedSessionId = null;
      update();
    } });
    
    const ratingSelect = el('select', { onChange: (e) => {
      state.ratingFilter = e.target.value;
      state.selectedMovieId = null;
      state.selectedSessionId = null;
      update();
    } });
    ['L', '12', '14', '16'].forEach(r => {
      const opt = el('option', { value: r, textContent: r });
      if (state.ratingFilter === r) opt.selected = true;
      ratingSelect.appendChild(opt);
    });

    return el('div', { className: 'section filters' }, [
      el('h2', 'Filtros'),
      genreInput,
      ratingSelect
    ]);
  }

  function renderMovies() {
    const movies = listMovies({ genre: state.genreFilter || undefined, maxRating: state.ratingFilter });
    const list = el('ul', { className: 'movie-list' });
    movies.forEach(m => {
      const li = el('li', { className: state.selectedMovieId === m.id ? 'movie-item selected' : 'movie-item', onClick: () => {
        state.selectedMovieId = m.id;
        state.selectedSessionId = null;
        update();
      } }, [
        el('strong', m.title),
        el('span', ` - ${m.genre} [${m.rating}] (${m.durationMinutes}m)`)
      ]);
      list.appendChild(li);
    });
    return el('div', { className: 'section movies' }, [el('h2', 'Filmes'), list]);
  }

  function renderSessions() {
    const sessions = SESSIONS.filter(s => s.movieId === state.selectedMovieId);
    const list = el('ul', { className: 'session-list' });
    sessions.forEach(s => {
      const li = el('li', { className: state.selectedSessionId === s.id ? 'session-item selected' : 'session-item', onClick: () => {
        state.selectedSessionId = s.id;
        try {
          state.seatMapObj = createSeatMap(s.id, globalOccupiedSeats[s.id] || []);
          state.seats = [];
          state.error = null;
        } catch (e) {
          state.error = e.message;
        }
        update();
      } }, [
        el('span', `${s.time} - ${s.roomType}`)
      ]);
      list.appendChild(li);
    });
    return el('div', { className: 'section sessions' }, [el('h2', 'Sessões'), list]);
  }

  function renderSeats() {
    const ticketSelector = el('div', { className: 'ticket-selector' }, [
      el('label', {}, [
        el('input', { type: 'radio', name: 'ticketKind', value: 'full', checked: state.ticketKindSelector === 'full' ? 'true' : undefined, onChange: () => state.ticketKindSelector = 'full' }),
        el('span', ' Inteira')
      ]),
      el('label', {}, [
        el('input', { type: 'radio', name: 'ticketKind', value: 'half', checked: state.ticketKindSelector === 'half' ? 'true' : undefined, onChange: () => state.ticketKindSelector = 'half' }),
        el('span', ' Meia')
      ])
    ]);

    const grid = el('div', { className: 'seat-grid' });
    for (const r of ROWS) {
      const rowDiv = el('div', { className: 'seat-row' });
      for (let i = 1; i <= COLUMNS; i++) {
        const code = `${r}${i}`;
        const isOccupied = (globalOccupiedSeats[state.selectedSessionId] || []).includes(code);
        const isSelected = state.seats.some(s => s.code === code);
        const className = `seat ${isOccupied ? 'occupied' : isSelected ? 'selected' : 'free'}`;
        const seatBtn = el('button', { className, textContent: code, onClick: () => {
          if (isOccupied) return; // Cannot select occupied
          if (isSelected) {
            state.seatMapObj.releaseSeat(code);
            state.seats = state.seats.filter(s => s.code !== code);
          } else {
            try {
              state.seatMapObj.selectSeat(code, state.ticketKindSelector);
              state.seats.push({ code, ticketKind: state.ticketKindSelector });
              state.error = null;
            } catch (e) {
              state.error = e.message;
            }
          }
          update();
        } });
        rowDiv.appendChild(seatBtn);
      }
      grid.appendChild(rowDiv);
    }
    return el('div', { className: 'section seats' }, [el('h2', 'Poltronas'), ticketSelector, grid]);
  }

  function renderSnacks() {
    const list = el('div', { className: 'snack-list' });
    listSnacks().forEach(snack => {
      const existing = state.snacks.find(s => s.snackId === snack.id);
      const qty = existing ? existing.qty : 0;
      
      const item = el('div', { className: 'snack-item' }, [
        el('span', `${snack.name} - R$ ${snack.price.toFixed(2)}`),
        el('div', { className: 'snack-controls' }, [
          el('button', { textContent: '-', onClick: () => {
            if (qty > 1) {
              existing.qty--;
            } else if (qty === 1) {
              state.snacks = state.snacks.filter(s => s.snackId !== snack.id);
            }
            update();
          } }),
          el('span', qty.toString()),
          el('button', { textContent: '+', onClick: () => {
            if (qty < 10) {
              if (existing) {
                existing.qty++;
              } else {
                state.snacks.push({ snackId: snack.id, qty: 1 });
              }
              update();
            }
          } })
        ])
      ]);
      list.appendChild(item);
    });
    return el('div', { className: 'section snacks' }, [el('h2', 'Bomboniere'), list]);
  }

  function renderCheckout() {
    const nameInput = el('input', { type: 'text', placeholder: 'Nome do Comprador', value: state.buyerName, onInput: (e) => state.buyerName = e.target.value });
    const couponInput = el('input', { type: 'text', placeholder: 'Cupom', value: state.couponCode, onInput: (e) => state.couponCode = e.target.value });
    const btn = el('button', { textContent: 'Finalizar Compra', onClick: () => {
      try {
        const order = buildCinemaOrder({
          sessionId: state.selectedSessionId,
          seats: state.seats,
          snacks: state.snacks,
          couponCode: state.couponCode,
          buyerName: state.buyerName
        });
        
        if (!globalOccupiedSeats[state.selectedSessionId]) {
          globalOccupiedSeats[state.selectedSessionId] = [];
        }
        globalOccupiedSeats[state.selectedSessionId].push(...state.seats.map(s => s.code));

        state.voucher = order;
        state.error = null;
      } catch (e) {
        state.error = e.message;
      }
      update();
    } });
    return el('div', { className: 'section checkout' }, [
      el('h2', 'Checkout'),
      nameInput,
      couponInput,
      btn
    ]);
  }

  update();
}

module.exports = { initApp, el };
