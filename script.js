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

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function buildMarquee() {
    var marquee = el('div', 'marquee');
    marquee.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < ROW_COUNT; i++) {
      marquee.appendChild(createRow());
    }
    return marquee;
  }

  // ----- Views: each returns { title, node } -----

  function homeView() {
    var home = el('div', 'home');
    home.appendChild(el('h1', 'visually-hidden', 'Dan'));
    home.appendChild(buildMarquee());
    home.appendChild(el('button', 'action-button', 'Dan')).type = 'button';
    return { title: 'Dan', node: home };
  }

  function contentView(title, paragraph) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', title));
    container.appendChild(el('p', null, paragraph));
    return container;
  }

  function aboutView() {
    return {
      title: 'About \u2013 Dan',
      node: contentView('About', 'Dan is a small single-page app with client-side routing.')
    };
  }

  function notFoundView() {
    var container = contentView('Page not found (404)', 'The page you are looking for does not exist.');
    var link = el('a', 'text-link', 'Back to home');
    link.href = '#/';
    container.appendChild(link);
    return { title: '404 \u2013 Dan', node: container };
  }

  var ROUTES = {
    '/': homeView,
    '/about': aboutView
  };

  function currentPath() {
    var hash = window.location.hash.replace(/^#/, '');
    var path = hash.split('?')[0];
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    if (path.length > 1) {
      path = path.replace(/\/+$/, '') || '/';
    }
    return path;
  }

  var hasRendered = false;

  function render() {
    var app = document.getElementById('app');
    if (!app) {
      return;
    }
    var path = currentPath();
    var factory = Object.prototype.hasOwnProperty.call(ROUTES, path) ? ROUTES[path] : notFoundView;
    var view = factory();

    app.textContent = '';
    app.appendChild(view.node);
    document.title = view.title;

    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      var linkPath = links[i].getAttribute('href').replace(/^#/, '');
      if (linkPath === path) {
        links[i].setAttribute('aria-current', 'page');
      } else {
        links[i].removeAttribute('aria-current');
      }
    }

    // Move focus to the new view on navigation (not on first load).
    if (hasRendered) {
      app.focus();
    }
    hasRendered = true;
  }

  // The skip link must not touch location.hash (that would route to a 404).
  function bindSkipLink() {
    var skip = document.querySelector('.skip-link');
    var app = document.getElementById('app');
    if (!skip || !app) {
      return;
    }
    skip.addEventListener('click', function (event) {
      event.preventDefault();
      app.focus();
    });
  }

  function start() {
    bindSkipLink();
    window.addEventListener('hashchange', render);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
