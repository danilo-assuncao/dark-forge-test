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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
