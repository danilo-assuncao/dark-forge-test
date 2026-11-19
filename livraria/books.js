/* Dan Books catalog: literary collection grouped by genre, with formats
   (Capa Comum, Capa Dura, E-book) and page / reading-time metadata.
   Prices are in BRL cents. Exposed as window.DanBooksCatalog in the browser
   and via module.exports in Node. */
(function (root) {
  'use strict';

  var GENRES = [
    { id: 'ficcao-fantasia', name: 'Ficcao & Fantasia' },
    { id: 'tecnologia-ciencia', name: 'Tecnologia & Ciencia' },
    { id: 'negocios', name: 'Negocios' },
    { id: 'biografias', name: 'Biografias' },
  ];

  // priceFactor is applied to the book's base (Capa Comum) price.
  var FORMATS = [
    { id: 'capa-comum', name: 'Capa Comum', priceFactor: 1, physical: true },
    { id: 'capa-dura', name: 'Capa Dura', priceFactor: 1.5, physical: true },
    { id: 'ebook', name: 'E-book', priceFactor: 0.6, physical: false },
  ];

  var READING_PAGES_PER_HOUR = 40;

  var BOOKS = [
    { id: 'o-reino-de-cinzas', genre: 'ficcao-fantasia', title: 'O Reino de Cinzas', author: 'Helena Marques', price: 5990, pages: 412, formats: ['capa-comum', 'capa-dura', 'ebook'] },
    { id: 'a-torre-dos-ventos', genre: 'ficcao-fantasia', title: 'A Torre dos Ventos', author: 'Caio Ribeiro', price: 4990, pages: 336, formats: ['capa-comum', 'ebook'] },
    { id: 'cronicas-do-vale-azul', genre: 'ficcao-fantasia', title: 'Cronicas do Vale Azul', author: 'Marina Duarte', price: 6990, pages: 528, formats: ['capa-comum', 'capa-dura', 'ebook'] },
    { id: 'algoritmos-na-pratica', genre: 'tecnologia-ciencia', title: 'Algoritmos na Pratica', author: 'Rafael Nogueira', price: 8990, pages: 464, formats: ['capa-comum', 'capa-dura', 'ebook'] },
    { id: 'cosmos-em-perspectiva', genre: 'tecnologia-ciencia', title: 'Cosmos em Perspectiva', author: 'Luiza Albuquerque', price: 7490, pages: 288, formats: ['capa-comum', 'capa-dura'] },
    { id: 'inteligencia-artificial-simples', genre: 'tecnologia-ciencia', title: 'Inteligencia Artificial Simples', author: 'Bruno Tavares', price: 6490, pages: 240, formats: ['capa-comum', 'ebook'] },
    { id: 'lideranca-essencial', genre: 'negocios', title: 'Lideranca Essencial', author: 'Patricia Lemos', price: 5490, pages: 216, formats: ['capa-comum', 'capa-dura', 'ebook'] },
    { id: 'financas-sem-medo', genre: 'negocios', title: 'Financas sem Medo', author: 'Andre Siqueira', price: 4590, pages: 192, formats: ['capa-comum', 'ebook'] },
    { id: 'startups-do-zero', genre: 'negocios', title: 'Startups do Zero', author: 'Camila Prado', price: 6190, pages: 304, formats: ['capa-comum', 'capa-dura', 'ebook'] },
    { id: 'memorias-de-um-navegador', genre: 'biografias', title: 'Memorias de um Navegador', author: 'Tomas Valente', price: 6790, pages: 380, formats: ['capa-comum', 'capa-dura', 'ebook'] },
    { id: 'a-cientista-e-o-mundo', genre: 'biografias', title: 'A Cientista e o Mundo', author: 'Sofia Brandao', price: 5790, pages: 320, formats: ['capa-comum', 'ebook'] },
    { id: 'vida-de-artista', genre: 'biografias', title: 'Vida de Artista', author: 'Joaquim Pires', price: 7290, pages: 448, formats: ['capa-comum', 'capa-dura'] },
  ];

  function findBook(id) {
    return BOOKS.filter(function (b) { return b.id === id; })[0] || null;
  }

  function findFormat(id) {
    return FORMATS.filter(function (f) { return f.id === id; })[0] || null;
  }

  function booksByGenre(genreId) {
    if (!genreId) return BOOKS.slice();
    return BOOKS.filter(function (b) { return b.genre === genreId; });
  }

  // Estimated reading time in minutes (40 pages/hour); null for invalid pages.
  function readingMinutes(pages) {
    if (typeof pages !== 'number' || !isFinite(pages) || pages <= 0) return null;
    return Math.max(1, Math.round((pages / READING_PAGES_PER_HOUR) * 60));
  }

  function formatReadingTime(minutes) {
    if (typeof minutes !== 'number' || !isFinite(minutes) || minutes <= 0) return '';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    if (h === 0) return m + ' min';
    return m === 0 ? h + ' h' : h + ' h ' + m + ' min';
  }

  // Price in cents for a book in a given format; null when unavailable.
  function priceFor(bookId, formatId) {
    var b = findBook(bookId);
    var f = findFormat(formatId);
    if (!b || !f || b.formats.indexOf(f.id) === -1) return null;
    return Math.round(b.price * f.priceFactor);
  }

  // Page count is not meaningful for e-books on a physical sheet, but the
  // metadata still reports the print-equivalent page count and reading time.
  function metaFor(bookId) {
    var b = findBook(bookId);
    if (!b) return null;
    var minutes = readingMinutes(b.pages);
    return { pages: b.pages, readingMinutes: minutes, readingTime: formatReadingTime(minutes) };
  }

  // Returns '' for non-numeric, non-finite or negative input so an unavailable
  // price (priceFor -> null) is never rendered as free.
  function formatBRL(cents) {
    if (typeof cents !== 'number' || !isFinite(cents) || cents < 0) return '';
    var v = (cents / 100).toFixed(2).replace('.', ',');
    return 'R$ ' + v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var api = {
    GENRES: GENRES, FORMATS: FORMATS, BOOKS: BOOKS,
    findBook: findBook, findFormat: findFormat, booksByGenre: booksByGenre,
    readingMinutes: readingMinutes, formatReadingTime: formatReadingTime,
    priceFor: priceFor, metaFor: metaFor, formatBRL: formatBRL,
  };
  root.DanBooksCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
