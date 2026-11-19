/* Dan Books recommender: estimates days to finish a book from daily reading
   minutes, recommends titles by genre/pace and picks a monthly club box plan.
   Depends on the catalog (books.js). Exposed as window.DanBooksRecommender in
   the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  // Resolved lazily so script load order in the browser does not matter, and
  // a missing catalog fails with a clear error instead of a TypeError.
  function catalog() {
    var c = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
      ? require('./books.js')
      : root.DanBooksCatalog;
    if (!c) throw new Error('DanBooksRecommender requires books.js (DanBooksCatalog) to be loaded first');
    return c;
  }

  var DAYS_PER_MONTH = 30;

  // Monthly club plans; price in BRL cents, booksPerMonth is the box size.
  var PLANS = [
    { id: 'leve', name: 'Box Leve', booksPerMonth: 1, price: 4990 },
    { id: 'classico', name: 'Box Classico', booksPerMonth: 2, price: 8990 },
    { id: 'maratona', name: 'Box Maratona', booksPerMonth: 4, price: 15990 },
  ];

  function validMinutes(m) {
    return typeof m === 'number' && isFinite(m) && m > 0;
  }

  function resolveBook(bookOrId) {
    if (bookOrId && typeof bookOrId === 'object') return bookOrId;
    return catalog().findBook(bookOrId);
  }

  // Days needed to finish a book (object or id) reading minutesPerDay daily;
  // null for unknown books or invalid minutes.
  function daysToFinish(bookOrId, minutesPerDay) {
    var book = resolveBook(bookOrId);
    if (!book || !validMinutes(minutesPerDay)) return null;
    var total = catalog().readingMinutes(book.pages);
    if (total === null) return null;
    return Math.ceil(total / minutesPerDay);
  }

  // Titles ordered from quickest to longest read. Options: genre (optional),
  // minutesPerDay (required), limit (optional), maxDays (optional filter).
  function recommend(opts) {
    opts = opts || {};
    if (!validMinutes(opts.minutesPerDay)) return [];
    var list = catalog().booksByGenre(opts.genre || undefined).map(function (b) {
      return {
        book: b,
        readingMinutes: catalog().readingMinutes(b.pages),
        days: daysToFinish(b, opts.minutesPerDay),
      };
    }).filter(function (r) {
      return r.days !== null && (!isFinite(opts.maxDays) || typeof opts.maxDays !== 'number' || r.days <= opts.maxDays);
    });
    list.sort(function (a, b) { return a.days - b.days || a.book.pages - b.book.pages; });
    if (typeof opts.limit === 'number' && isFinite(opts.limit) && opts.limit >= 0) list = list.slice(0, Math.floor(opts.limit));
    return list;
  }

  // Picks the largest plan whose books the reader can finish in a month,
  // based on the average reading time of the genre. At least the smallest plan.
  function recommendPlan(opts) {
    opts = opts || {};
    if (!validMinutes(opts.minutesPerDay)) return null;
    var books = catalog().booksByGenre(opts.genre || undefined);
    if (!books.length) return null;
    var avg = books.reduce(function (s, b) { return s + catalog().readingMinutes(b.pages); }, 0) / books.length;
    var capacity = opts.minutesPerDay * DAYS_PER_MONTH;
    // Never promise more books than the genre actually has.
    var fit = Math.min(Math.floor(capacity / avg), books.length);
    var plan = PLANS[0];
    PLANS.forEach(function (p) { if (p.booksPerMonth <= fit) plan = p; });
    return { plan: plan, booksPerMonthCapacity: fit, averageReadingMinutes: Math.round(avg) };
  }

  // Full recommendation: plan plus the titles to fill the box.
  function recommendBox(opts) {
    var p = recommendPlan(opts);
    if (!p) return null;
    return {
      plan: p.plan,
      booksPerMonthCapacity: p.booksPerMonthCapacity,
      titles: recommend({ genre: opts.genre, minutesPerDay: opts.minutesPerDay, limit: p.plan.booksPerMonth }),
    };
  }

  var api = {
    PLANS: PLANS, DAYS_PER_MONTH: DAYS_PER_MONTH,
    daysToFinish: daysToFinish, recommend: recommend,
    recommendPlan: recommendPlan, recommendBox: recommendBox,
  };
  root.DanBooksRecommender = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
