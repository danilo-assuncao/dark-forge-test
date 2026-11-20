'use strict';

/* Categorized digital menu with dietary and allergen filters.
   Prices are in BRL (reais, two decimals). */

const CATEGORIES = Object.freeze(['entradas', 'principais', 'sobremesas', 'bebidas']);
const DIETARY_TAGS = Object.freeze(['vegano', 'vegetariano', 'sem-gluten']);
const ALLERGENS = Object.freeze(['lactose', 'gluten', 'castanhas', 'frutos-do-mar']);

function dish(id, name, category, priceBrl, prepMinutes, dietaryTags, allergens) {
  return Object.freeze({
    id, name, category, priceBrl, prepMinutes,
    dietaryTags: Object.freeze(dietaryTags),
    allergens: Object.freeze(allergens),
  });
}

const MENU = Object.freeze([
  dish('ent-bruschetta', 'Bruschetta de tomate', 'entradas', 24.9, 10, ['vegano', 'vegetariano'], ['gluten']),
  dish('ent-bolinho-camarao', 'Bolinho de camarão', 'entradas', 36.5, 15, [], ['frutos-do-mar', 'gluten']),
  dish('ent-salada-castanhas', 'Salada verde com castanhas', 'entradas', 29.9, 8, ['vegano', 'vegetariano', 'sem-gluten'], ['castanhas']),
  dish('pri-risoto-cogumelos', 'Risoto de cogumelos', 'principais', 58.0, 30, ['vegetariano', 'sem-gluten'], ['lactose']),
  dish('pri-moqueca-camarao', 'Moqueca de camarão', 'principais', 79.9, 35, ['sem-gluten'], ['frutos-do-mar']),
  dish('pri-curry-grao-de-bico', 'Curry de grão-de-bico', 'principais', 49.9, 25, ['vegano', 'vegetariano', 'sem-gluten'], []),
  dish('pri-lasanha-queijo', 'Lasanha de queijos', 'principais', 54.0, 28, ['vegetariano'], ['gluten', 'lactose']),
  dish('sob-pudim', 'Pudim de leite', 'sobremesas', 18.0, 5, ['vegetariano', 'sem-gluten'], ['lactose']),
  dish('sob-brownie-nozes', 'Brownie com nozes', 'sobremesas', 22.5, 8, ['vegetariano'], ['gluten', 'lactose', 'castanhas']),
  dish('sob-sorbet-manga', 'Sorbet de manga', 'sobremesas', 16.0, 4, ['vegano', 'vegetariano', 'sem-gluten'], []),
  dish('beb-suco-laranja', 'Suco de laranja', 'bebidas', 12.0, 3, ['vegano', 'vegetariano', 'sem-gluten'], []),
  dish('beb-vitamina-banana', 'Vitamina de banana com leite', 'bebidas', 15.0, 4, ['vegetariano', 'sem-gluten'], ['lactose']),
]);

function assertKnown(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new RangeError(`Unknown ${label}: ${String(value)}`);
  }
}

function copy(d) {
  return { ...d, dietaryTags: [...d.dietaryTags], allergens: [...d.allergens] };
}

function filterMenu({ category, requiredTag, excludeAllergens = [] } = {}) {
  if (category !== undefined) assertKnown(category, CATEGORIES, 'category');
  if (requiredTag !== undefined) assertKnown(requiredTag, DIETARY_TAGS, 'dietary tag');
  if (!Array.isArray(excludeAllergens)) {
    throw new TypeError('excludeAllergens must be an array');
  }
  excludeAllergens.forEach((a) => assertKnown(a, ALLERGENS, 'allergen'));

  return MENU.filter((d) =>
    (category === undefined || d.category === category) &&
    (requiredTag === undefined || d.dietaryTags.includes(requiredTag)) &&
    !d.allergens.some((a) => excludeAllergens.includes(a))
  ).map(copy);
}

function getDishById(id) {
  const found = MENU.find((d) => d.id === id);
  return found ? copy(found) : null;
}

module.exports = { MENU, CATEGORIES, DIETARY_TAGS, ALLERGENS, filterMenu, getDishById };
