/* Academia class catalog: group-class modalities, instructors, duration,
   calorie burn and student capacity. Exposed as window.AcademiaClasses in the
   browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var INTENSITIES = [
    { id: 'leve', name: 'Leve', level: 1 },
    { id: 'moderada', name: 'Moderada', level: 2 },
    { id: 'alta', name: 'Alta', level: 3 },
  ];

  var INSTRUCTORS = [
    { id: 'carla-mendes', name: 'Carla Mendes', specialties: ['forca-funcional'] },
    { id: 'rafael-souza', name: 'Rafael Souza', specialties: ['spinning'] },
    { id: 'helena-prado', name: 'Helena Prado', specialties: ['yoga-mobilidade'] },
    { id: 'bruno-tavares', name: 'Bruno Tavares', specialties: ['boxe', 'forca-funcional'] },
  ];

  // durationMin: minutes per session; caloriesPerSession: estimated average
  // burn per student; capacity: max students per session.
  var CLASSES = [
    { id: 'forca-funcional', name: 'Forca & Funcional', instructors: ['carla-mendes', 'bruno-tavares'], durationMin: 50, caloriesPerSession: 450, capacity: 20, intensity: 'alta' },
    { id: 'spinning', name: 'Spinning', instructors: ['rafael-souza'], durationMin: 45, caloriesPerSession: 550, capacity: 25, intensity: 'alta' },
    { id: 'yoga-mobilidade', name: 'Yoga & Mobilidade', instructors: ['helena-prado'], durationMin: 60, caloriesPerSession: 200, capacity: 15, intensity: 'leve' },
    { id: 'boxe', name: 'Boxe', instructors: ['bruno-tavares'], durationMin: 55, caloriesPerSession: 500, capacity: 16, intensity: 'moderada' },
  ];

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getClass(id) { return find(CLASSES, id); }
  function getInstructor(id) { return find(INSTRUCTORS, id); }
  function getIntensity(id) { return find(INTENSITIES, id); }

  function instructorsFor(classId) {
    var c = getClass(classId);
    if (!c) return [];
    return c.instructors.map(getInstructor).filter(Boolean);
  }

  function classesByIntensity(intensityId) {
    return CLASSES.filter(function (c) { return c.intensity === intensityId; });
  }

  function classesByInstructor(instructorId) {
    return CLASSES.filter(function (c) { return c.instructors.indexOf(instructorId) !== -1; });
  }

  // Estimated calories burned per minute, rounded to one decimal.
  function caloriesPerMinute(classId) {
    var c = getClass(classId);
    if (!c) return null;
    return Math.round((c.caloriesPerSession / c.durationMin) * 10) / 10;
  }

  // Seats left given the number of booked students; never negative.
  // Fails closed: Infinity means sold out (0); negatives count as no bookings;
  // missing or non-numeric input (null, undefined, '', NaN, 'abc') returns null
  // so callers cannot mistake it for a free class.
  function spotsLeft(classId, booked) {
    var c = getClass(classId);
    if (!c) return null;
    if (booked === null || booked === undefined || booked === '') return null;
    var n = Number(booked);
    if (n !== n) return null;
    if (n < 0) n = 0;
    return Math.max(0, c.capacity - Math.floor(n));
  }

  var api = {
    INTENSITIES: INTENSITIES,
    INSTRUCTORS: INSTRUCTORS,
    CLASSES: CLASSES,
    getClass: getClass,
    getInstructor: getInstructor,
    getIntensity: getIntensity,
    instructorsFor: instructorsFor,
    classesByIntensity: classesByIntensity,
    classesByInstructor: classesByInstructor,
    caloriesPerMinute: caloriesPerMinute,
    spotsLeft: spotsLeft,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AcademiaClasses = api;
})(typeof window !== 'undefined' ? window : this);
