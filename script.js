(function () {
  'use strict';

  var ROW_COUNT = 6;
  var WORDS_PER_HALF = 12;
  var WORD_TEXT = 'Dan';

  function createWord() {
    var span = document.createElement('span');
    span.className = 'word';
    span.textContent = WORD_TEXT;
    return span;
  }

  function createHalf() {
    var half = document.createElement('div');
    half.className = 'half';
    for (var i = 0; i < WORDS_PER_HALF; i++) {
      half.appendChild(createWord());
    }
    return half;
  }

  function createRow() {
    var row = document.createElement('div');
    row.className = 'row';

    var track = document.createElement('div');
    track.className = 'track';

    // Two identical halves: animating -50% loops seamlessly.
    track.appendChild(createHalf());
    track.appendChild(createHalf());

    row.appendChild(track);
    return row;
  }

  function build() {
    var container = document.getElementById('marquee');
    if (!container) {
      return;
    }
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < ROW_COUNT; i++) {
      fragment.appendChild(createRow());
    }
    container.appendChild(fragment);
  }

  var STORAGE_KEY = 'theme';

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // Storage unavailable: ignore, theme still applies for this session.
    }
  }

  function applyTheme(theme, button) {
    var root = document.documentElement;
    var isDark = theme === 'dark';
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    if (button) {
      button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      button.textContent = isDark ? 'Dark mode: on' : 'Dark mode: off';
    }
  }

  function initTheme() {
    var button = document.getElementById('theme-toggle');
    applyTheme(readStoredTheme(), button);
    if (!button) {
      return;
    }
    button.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, button);
      storeTheme(next);
    });
  }

  function init() {
    initTheme();
    build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
