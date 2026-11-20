'use strict';

const RATING_ORDER = Object.freeze(['L', '12', '14', '16']);

const BASE_TICKET_PRICES = Object.freeze({
  '2D': 36.0,
  VIP: 64.0,
  IMAX: 52.0,
});

const MOVIES = Object.freeze([
  Object.freeze({ id: 'mov-aventura-estelar', title: 'Aventura Estelar', genre: 'animação', rating: 'L', durationMinutes: 95 }),
  Object.freeze({ id: 'mov-fronteira-final', title: 'Fronteira Final', genre: 'ficção científica', rating: '12', durationMinutes: 128 }),
  Object.freeze({ id: 'mov-noite-de-risos', title: 'Noite de Risos', genre: 'comédia', rating: '14', durationMinutes: 102 }),
  Object.freeze({ id: 'mov-sombras-na-estrada', title: 'Sombras na Estrada', genre: 'terror', rating: '16', durationMinutes: 110 }),
]);

const SESSIONS = Object.freeze([
  Object.freeze({ id: 'ses-001', movieId: 'mov-aventura-estelar', roomType: '2D', time: '14:00' }),
  Object.freeze({ id: 'ses-002', movieId: 'mov-fronteira-final', roomType: 'IMAX', time: '16:30' }),
  Object.freeze({ id: 'ses-003', movieId: 'mov-noite-de-risos', roomType: '2D', time: '19:00' }),
  Object.freeze({ id: 'ses-004', movieId: 'mov-sombras-na-estrada', roomType: 'VIP', time: '21:30' }),
  Object.freeze({ id: 'ses-005', movieId: 'mov-fronteira-final', roomType: 'VIP', time: '20:00' }),
]);

function listMovies(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const { genre, maxRating } = options;
  if (genre !== undefined && (typeof genre !== 'string' || genre.trim() === '')) {
    throw new TypeError('genre must be a non-empty string');
  }
  let maxIndex = RATING_ORDER.length - 1;
  if (maxRating !== undefined) {
    if (typeof maxRating !== 'string') {
      throw new TypeError('maxRating must be a string');
    }
    maxIndex = RATING_ORDER.indexOf(maxRating);
    if (maxIndex === -1) {
      throw new RangeError(`maxRating must be one of: ${RATING_ORDER.join(', ')}`);
    }
  }
  const wanted = genre === undefined ? null : genre.trim().toLowerCase();
  return MOVIES.filter(
    (m) => RATING_ORDER.indexOf(m.rating) <= maxIndex && (wanted === null || m.genre === wanted),
  );
}

function getSessionById(sessionId) {
  if (typeof sessionId !== 'string') {
    throw new TypeError('sessionId must be a string');
  }
  if (sessionId.trim() === '') {
    throw new RangeError('sessionId must not be empty');
  }
  return SESSIONS.find((s) => s.id === sessionId) || null;
}

function getBaseTicketPrice(roomType) {
  if (typeof roomType !== 'string') {
    throw new TypeError('roomType must be a string');
  }
  if (!Object.prototype.hasOwnProperty.call(BASE_TICKET_PRICES, roomType)) {
    throw new RangeError(`roomType must be one of: ${Object.keys(BASE_TICKET_PRICES).join(', ')}`);
  }
  return BASE_TICKET_PRICES[roomType];
}

module.exports = {
  MOVIES,
  SESSIONS,
  RATING_ORDER,
  BASE_TICKET_PRICES,
  listMovies,
  getSessionById,
  getBaseTicketPrice,
};
