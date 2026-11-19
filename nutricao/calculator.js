/* Dan Nutri calculator: BMI, BMR (Mifflin-St Jeor), daily goals per
   objective and compatible catalog suggestions. Exposed as
   window.DanNutriCalculator (and via module.exports in Node). */
(function (root) {
  'use strict';

  var catalog = (typeof require === 'function' && typeof module !== 'undefined' && module.exports)
    ? require('./products.js')
    : root.DanNutriProducts;

  var ACTIVITY = Object.freeze({ sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, muito_intenso: 1.9 });

  // kcal factor applied to TDEE, protein g per kg of body weight
  var GOAL_RULES = Object.freeze({
    Hipertrofia: Object.freeze({ kcalFactor: 1.15, proteinPerKg: 2.0 }),
    Emagrecimento: Object.freeze({ kcalFactor: 0.8, proteinPerKg: 2.0 }),
    Saude: Object.freeze({ kcalFactor: 1.0, proteinPerKg: 1.4 })
  });

  // Plausible human limits; anything outside is rejected as invalid input.
  var LIMITS = { weightKg: 500, heightCm: 300, age: 120 };
  var MINIMUMS = { weightKg: 2, heightCm: 30, age: 1 };

  function positive(value, name) {
    if (typeof value !== 'number' || !isFinite(value) || value < MINIMUMS[name] || value > LIMITS[name]) {
      throw new RangeError(name + ' must be a number between ' + MINIMUMS[name] + ' and ' + LIMITS[name]);
    }
    return value;
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  function rawBmi(weightKg, heightCm) {
    positive(weightKg, 'weightKg');
    var m = positive(heightCm, 'heightCm') / 100;
    return weightKg / (m * m);
  }

  function bmi(weightKg, heightCm) {
    return round1(rawBmi(weightKg, heightCm));
  }

  // Expects the unrounded BMI; prefer bmiClassification(weightKg, heightCm),
  // since bmi() is rounded and can sit on the other side of a threshold.
  function bmiCategory(value) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) {
      throw new RangeError('BMI must be a non-negative finite number');
    }
    if (value < 18.5) { return 'Abaixo do peso'; }
    if (value < 25) { return 'Peso normal'; }
    if (value < 30) { return 'Sobrepeso'; }
    return 'Obesidade';
  }

  function bmiClassification(weightKg, heightCm) {
    return bmiCategory(rawBmi(weightKg, heightCm));
  }

  // Mifflin-St Jeor: 10w + 6.25h - 5a + 5 (male) / - 161 (female)
  function bmr(profile) {
    var p = profile || {};
    positive(p.weightKg, 'weightKg');
    positive(p.heightCm, 'heightCm');
    positive(p.age, 'age');
    if (p.sex !== 'M' && p.sex !== 'F') {
      throw new RangeError("sex must be 'M' or 'F'");
    }
    var base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
    var result = Math.round(base + (p.sex === 'M' ? 5 : -161));
    if (result <= 0) {
      throw new RangeError('profile yields a non-positive BMR');
    }
    return result;
  }

  function tdee(profile) {
    var level = profile && profile.activity !== undefined ? profile.activity : 'sedentario';
    if (!Object.prototype.hasOwnProperty.call(ACTIVITY, level)) {
      throw new RangeError('unknown activity level: ' + level);
    }
    return Math.round(bmr(profile) * ACTIVITY[level]);
  }

  function dailyTargets(profile, goal) {
    if (!Object.prototype.hasOwnProperty.call(GOAL_RULES, goal)) {
      throw new RangeError('unknown goal: ' + goal);
    }
    var rule = GOAL_RULES[goal];
    var kcal = Math.round(tdee(profile) * rule.kcalFactor);
    return { goal: goal, kcal: kcal, proteinG: Math.round(profile.weightKg * rule.proteinPerKg) };
  }

  // Catalog items tagged with the goal; optional category filter via
  // opts.category.
  function suggestProducts(goal, opts) {
    if (!Object.prototype.hasOwnProperty.call(GOAL_RULES, goal)) {
      throw new RangeError('unknown goal: ' + goal);
    }
    var category = opts && opts.category;
    return catalog.byGoal(goal).filter(function (p) {
      return !category || p.category === category;
    });
  }

  function calculate(profile, goal) {
    var p = profile || {};
    var raw = rawBmi(p.weightKg, p.heightCm);
    return {
      bmi: round1(raw),
      bmiCategory: bmiCategory(raw),
      bmr: bmr(p),
      tdee: tdee(p),
      targets: dailyTargets(p, goal),
      suggestions: suggestProducts(goal)
    };
  }

  var api = {
    activityLevels: ACTIVITY,
    bmi: bmi,
    bmiCategory: bmiCategory,
    bmiClassification: bmiClassification,
    bmr: bmr,
    tdee: tdee,
    dailyTargets: dailyTargets,
    suggestProducts: suggestProducts,
    calculate: calculate
  };

  root.DanNutriCalculator = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
