(function () {
  'use strict';

  var EVENTS = [
    {
      id: 'rock-festival',
      name: 'Rock in Dan',
      type: 'Festival',
      description: 'O maior festival de rock da cidade.',
      sectors: [
        { id: 'pista', name: 'Pista', priceCents: 15000 },
        { id: 'camarote', name: 'Camarote', priceCents: 40000 }
      ]
    },
    {
      id: 'teatro-comedia',
      name: 'Comédia Ao Vivo',
      type: 'Peça',
      description: 'Stand-up comedy com os melhores humoristas.',
      sectors: [
        { id: 'plateia', name: 'Plateia', priceCents: 8000 },
        { id: 'mezanino', name: 'Mezanino', priceCents: 5000 }
      ]
    },
    {
      id: 'show-pop',
      name: 'Pop Star Tour',
      type: 'Show',
      description: 'Show internacional de música pop.',
      sectors: [
        { id: 'pista-premium', name: 'Pista Premium', priceCents: 30000 },
        { id: 'pista', name: 'Pista', priceCents: 12000 }
      ]
    }
  ];

  window.DanEvents = {
    all: function () {
      return EVENTS.slice();
    },
    find: function (id) {
      for (var i = 0; i < EVENTS.length; i++) {
        if (EVENTS[i].id === id) {
          return EVENTS[i];
        }
      }
      return null;
    }
  };
})();
