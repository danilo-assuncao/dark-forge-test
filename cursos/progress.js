/* Dan Academy progress engine: persists watched lessons in localStorage
   (dan-academy-progress), computes completion % per course and issues a
   CERT-XXXX certificate code at 100%.
   Lessons are numbered 1..N where N is the course's `modules` count in the catalog.
   Exposed as window.DanAcademyProgress in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-academy-progress';
  var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var CODE_RE = /^CERT-[A-Z0-9]{4}$/;

  var catalog = root.DanAcademyCatalog || null;
  if (!catalog && typeof require === 'function') {
    try { catalog = require('./catalog.js'); } catch (e) { catalog = null; }
  }

  var memory = null;
  function defaultStorage() {
    try {
      if (root.localStorage) return root.localStorage;
    } catch (e) { /* storage blocked */ }
    if (!memory) {
      memory = {
        _d: {},
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
        setItem: function (k, v) { this._d[k] = String(v); },
        removeItem: function (k) { delete this._d[k]; }
      };
    }
    return memory;
  }

  function emptyState() { return { courses: {}, certificates: {} }; }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function load(storage) {
    storage = storage || defaultStorage();
    var state = emptyState();
    var parsed;
    try { parsed = JSON.parse(storage.getItem(STORAGE_KEY)); } catch (e) { return state; }
    if (!isObj(parsed)) return state;
    if (isObj(parsed.courses)) {
      Object.keys(parsed.courses).forEach(function (id) {
        var arr = parsed.courses[id];
        if (!Array.isArray(arr)) return;
        var seen = {}, out = [];
        arr.forEach(function (n) {
          if (typeof n === 'number' && n >= 1 && Math.floor(n) === n && !seen[n]) { seen[n] = true; out.push(n); }
        });
        state.courses[id] = out.sort(function (a, b) { return a - b; });
      });
    }
    if (isObj(parsed.certificates)) {
      Object.keys(parsed.certificates).forEach(function (id) {
        var c = parsed.certificates[id];
        if (isObj(c) && typeof c.code === 'string' && CODE_RE.test(c.code)) {
          state.certificates[id] = { code: c.code, issuedAt: typeof c.issuedAt === 'string' ? c.issuedAt : null };
        }
      });
    }
    return state;
  }

  function save(state, storage) {
    (storage || defaultStorage()).setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function totalLessons(courseId) {
    var curso = catalog && catalog.findCurso(courseId);
    if (!curso) throw new Error('Unknown course: ' + courseId);
    return curso.modules;
  }

  function getWatched(courseId, storage) {
    var total = totalLessons(courseId);
    return (load(storage).courses[courseId] || []).filter(function (n) { return n <= total; });
  }

  function getPercent(courseId, storage) {
    var total = totalLessons(courseId);
    var watched = (load(storage).courses[courseId] || []).filter(function (n) { return n <= total; });
    return Math.round((watched.length / total) * 100);
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function generateCode(courseId, state, hashFn, maxAttempts) {
    hashFn = hashFn || hash;
    maxAttempts = maxAttempts || 1000;
    var used = {};
    Object.keys(state.certificates).forEach(function (id) { used[state.certificates[id].code] = true; });
    var seed = hashFn(courseId);
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var n = (hashFn(courseId + ':' + attempt) ^ seed) >>> 0;
      var s = '';
      for (var i = 0; i < 4; i++) {
        s += CODE_CHARS.charAt(n % CODE_CHARS.length);
        n = Math.floor(n / CODE_CHARS.length) || (hashFn(s + attempt) >>> 0);
      }
      var code = 'CERT-' + s;
      if (CODE_RE.test(code) && !used[code]) return code;
    }
    throw new Error('Could not generate a unique certificate code');
  }

  /* NOTE: certificates are a cosmetic client-side badge only. The code is not
     secret nor verifiable; real proof of completion needs server-side issuance. */

  /* Marks a lesson (1..modules) as watched. Idempotent. Issues the certificate
     once the course reaches 100%. Returns { courseId, watched, percent, certificate }. */
  function markWatched(courseId, lesson, storage) {
    var total = totalLessons(courseId);
    if (typeof lesson !== 'number' || Math.floor(lesson) !== lesson || lesson < 1 || lesson > total) {
      throw new Error('Invalid lesson ' + lesson + ' for course ' + courseId + ' (1-' + total + ')');
    }
    var state = load(storage);
    var list = state.courses[courseId] || [];
    if (list.indexOf(lesson) === -1) list.push(lesson);
    list.sort(function (a, b) { return a - b; });
    state.courses[courseId] = list;
    var complete = list.filter(function (n) { return n <= total; }).length >= total;
    if (complete && !state.certificates[courseId]) {
      state.certificates[courseId] = { code: generateCode(courseId, state), issuedAt: new Date().toISOString() };
    }
    save(state, storage);
    return {
      courseId: courseId,
      watched: list.slice(),
      percent: getPercent(courseId, storage),
      certificate: state.certificates[courseId] || null
    };
  }

  function getCertificate(courseId, storage) {
    totalLessons(courseId);
    // Only honour certificates for courses currently at 100%.
    var c = getPercent(courseId, storage) === 100 ? load(storage).certificates[courseId] : null;
    return c ? { code: c.code, issuedAt: c.issuedAt } : null;
  }

  function reset(storage) {
    (storage || defaultStorage()).removeItem(STORAGE_KEY);
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    markWatched: markWatched, getWatched: getWatched, getPercent: getPercent,
    getCertificate: getCertificate, reset: reset,
    _generateCode: generateCode
  };

  root.DanAcademyProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
