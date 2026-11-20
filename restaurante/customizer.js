'use strict';

/* Dish customizer: doneness, paid extras and notes on top of the menu.
   Prices are in BRL (reais, two decimals). */

const { getDishById } = require('./menu.js');

const EXTRAS = Object.freeze({
  'queijo-extra': 6.0,
  'bacon-artesanal': 8.0,
  'molho-trufado': 10.0,
  'dobro-proteina': 18.0,
});
const DONENESS_OPTIONS = Object.freeze(['mal-passado', 'ao-ponto', 'bem-passado']);
const MAX_EXTRAS = 3;
const MIN_QTY = 1;
const MAX_QTY = 20;
const MAX_NOTES_LENGTH = 120;

const toCents = (brl) => Math.round(brl * 100);

function customizeDish(opts) {
  const { dishId, qty = 1, doneness = 'ao-ponto', extras = [], notes = '' } = opts ?? {};

  // NOTE: `notes` is untrusted user text, returned verbatim; escape it at every output sink.
  const dish = getDishById(dishId);
  if (!dish) throw new RangeError(`Unknown dish: ${String(dishId)}`);

  if (!Number.isInteger(qty) || qty < MIN_QTY || qty > MAX_QTY) {
    throw new RangeError(`qty must be an integer between ${MIN_QTY} and ${MAX_QTY}`);
  }
  if (!DONENESS_OPTIONS.includes(doneness)) {
    throw new RangeError(`Unknown doneness: ${String(doneness)}`);
  }
  if (!Array.isArray(extras)) throw new TypeError('extras must be an array');
  if (extras.length > MAX_EXTRAS) {
    throw new RangeError(`At most ${MAX_EXTRAS} extras per item`);
  }
  // Array.from turns sparse holes into undefined so every index is validated.
  const extraList = Array.from(extras);
  for (const e of extraList) {
    if (typeof e !== 'string' || !Object.prototype.hasOwnProperty.call(EXTRAS, e)) {
      throw new RangeError(`Unknown extra: ${String(e)}`);
    }
  }
  if (new Set(extraList).size !== extraList.length) {
    throw new RangeError('Duplicate extras are not allowed');
  }
  if (typeof notes !== 'string') throw new TypeError('notes must be a string');
  if (notes.length > MAX_NOTES_LENGTH) {
    throw new RangeError(`notes must have at most ${MAX_NOTES_LENGTH} characters`);
  }

  const extrasCents = extraList.reduce((sum, e) => sum + toCents(EXTRAS[e]), 0);
  const unitCents = toCents(dish.priceBrl) + extrasCents;

  return {
    dishId: dish.id,
    name: dish.name,
    qty,
    doneness,
    extras: extraList,
    notes,
    unitPriceBrl: unitCents / 100,
    totalBrl: (unitCents * qty) / 100,
  };
}

module.exports = { EXTRAS, DONENESS_OPTIONS, MAX_EXTRAS, MAX_QTY, MAX_NOTES_LENGTH, customizeDish };
