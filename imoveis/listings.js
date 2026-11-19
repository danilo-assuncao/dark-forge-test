/* Imóveis catalog: residential and commercial listings (Apartamentos, Casas,
   Studios, Salas Comerciais) for sale (Venda) or rent (Aluguel), with area in
   m², bedrooms, parking spots, neighborhood and condomínio/IPTU. Money is in
   BRL cents; condo and IPTU are monthly amounts. Exposed as
   window.ImoveisListings in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var TYPES = [
    { id: 'apartamento', name: 'Apartamento', commercial: false },
    { id: 'casa', name: 'Casa', commercial: false },
    { id: 'studio', name: 'Studio', commercial: false },
    { id: 'sala-comercial', name: 'Sala Comercial', commercial: true },
  ];

  var MODALITIES = [
    { id: 'venda', name: 'Venda' },
    { id: 'aluguel', name: 'Aluguel' },
  ];

  var NEIGHBORHOODS = [
    'Centro', 'Jardins', 'Vila Mariana', 'Pinheiros', 'Moema', 'Itaim Bibi', 'Tatuapé', 'Butantã',
  ];

  // price: sale price (venda) or monthly rent (aluguel); condo/iptu: monthly.
  var LISTINGS = [
    { id: 'apt-001', title: 'Apartamento 3 quartos em Moema', type: 'apartamento', modality: 'venda', neighborhood: 'Moema', areaM2: 98, bedrooms: 3, parking: 2, price: 125000000, condo: 128000, iptu: 52000 },
    { id: 'apt-002', title: 'Apartamento 2 quartos na Vila Mariana', type: 'apartamento', modality: 'venda', neighborhood: 'Vila Mariana', areaM2: 68, bedrooms: 2, parking: 1, price: 82000000, condo: 82000, iptu: 31000 },
    { id: 'apt-003', title: 'Apartamento 2 quartos em Pinheiros', type: 'apartamento', modality: 'aluguel', neighborhood: 'Pinheiros', areaM2: 74, bedrooms: 2, parking: 1, price: 520000, condo: 95000, iptu: 34000 },
    { id: 'apt-004', title: 'Apartamento 1 quarto no Tatuapé', type: 'apartamento', modality: 'aluguel', neighborhood: 'Tatuapé', areaM2: 45, bedrooms: 1, parking: 1, price: 280000, condo: 58000, iptu: 16000 },
    { id: 'apt-005', title: 'Cobertura 4 quartos nos Jardins', type: 'apartamento', modality: 'venda', neighborhood: 'Jardins', areaM2: 210, bedrooms: 4, parking: 3, price: 480000000, condo: 320000, iptu: 150000 },
    { id: 'cas-001', title: 'Casa 4 quartos no Butantã', type: 'casa', modality: 'venda', neighborhood: 'Butantã', areaM2: 220, bedrooms: 4, parking: 3, price: 165000000, condo: 0, iptu: 61000 },
    { id: 'cas-002', title: 'Casa 3 quartos na Vila Mariana', type: 'casa', modality: 'aluguel', neighborhood: 'Vila Mariana', areaM2: 150, bedrooms: 3, parking: 2, price: 850000, condo: 0, iptu: 42000 },
    { id: 'cas-003', title: 'Casa em condomínio no Tatuapé', type: 'casa', modality: 'venda', neighborhood: 'Tatuapé', areaM2: 180, bedrooms: 3, parking: 2, price: 135000000, condo: 90000, iptu: 48000 },
    { id: 'cas-004', title: 'Casa 2 quartos no Centro', type: 'casa', modality: 'aluguel', neighborhood: 'Centro', areaM2: 95, bedrooms: 2, parking: 1, price: 380000, condo: 0, iptu: 22000 },
    { id: 'stu-001', title: 'Studio mobiliado em Pinheiros', type: 'studio', modality: 'aluguel', neighborhood: 'Pinheiros', areaM2: 28, bedrooms: 0, parking: 0, price: 290000, condo: 52000, iptu: 9000 },
    { id: 'stu-002', title: 'Studio no Itaim Bibi', type: 'studio', modality: 'venda', neighborhood: 'Itaim Bibi', areaM2: 35, bedrooms: 0, parking: 1, price: 61000000, condo: 61000, iptu: 14000 },
    { id: 'stu-003', title: 'Studio no Centro', type: 'studio', modality: 'aluguel', neighborhood: 'Centro', areaM2: 24, bedrooms: 0, parking: 0, price: 160000, condo: 38000, iptu: 7000 },
    { id: 'com-001', title: 'Sala comercial no Itaim Bibi', type: 'sala-comercial', modality: 'aluguel', neighborhood: 'Itaim Bibi', areaM2: 55, bedrooms: 0, parking: 2, price: 650000, condo: 140000, iptu: 38000 },
    { id: 'com-002', title: 'Sala comercial nos Jardins', type: 'sala-comercial', modality: 'venda', neighborhood: 'Jardins', areaM2: 80, bedrooms: 0, parking: 2, price: 148000000, condo: 160000, iptu: 55000 },
    { id: 'com-003', title: 'Sala comercial no Centro', type: 'sala-comercial', modality: 'aluguel', neighborhood: 'Centro', areaM2: 38, bedrooms: 0, parking: 0, price: 240000, condo: 76000, iptu: 18000 },
    { id: 'com-004', title: 'Sala comercial em Moema', type: 'sala-comercial', modality: 'venda', neighborhood: 'Moema', areaM2: 42, bedrooms: 0, parking: 1, price: 69000000, condo: 88000, iptu: 21000 },
  ];

  function byId(id) {
    return LISTINGS.filter(function (l) { return l.id === id; })[0] || null;
  }

  function typeById(id) {
    return TYPES.filter(function (t) { return t.id === id; })[0] || null;
  }

  function normalize(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function isCommercial(listing) {
    var t = typeById(listing.type);
    return !!(t && t.commercial);
  }

  // Filters (all optional): type, modality, neighborhood, minArea, maxArea,
  // minBedrooms, minParking, maxPrice (cents), q (title/neighborhood text).
  // Numeric filters are applied only when finite numbers (NaN, strings and
  // undefined are ignored). maxPrice compares the raw listing price (sale
  // price or monthly rent), so pair it with `modality` to get meaningful results.
  function filterListings(f) {
    f = f || {};
    var q = normalize(f.q);
    var nb = normalize(f.neighborhood);
    return LISTINGS.filter(function (l) {
      if (f.type && l.type !== f.type) return false;
      if (f.modality && l.modality !== f.modality) return false;
      if (nb && normalize(l.neighborhood) !== nb) return false;
      if (Number.isFinite(f.minArea) && l.areaM2 < f.minArea) return false;
      if (Number.isFinite(f.maxArea) && l.areaM2 > f.maxArea) return false;
      if (Number.isFinite(f.minBedrooms) && l.bedrooms < f.minBedrooms) return false;
      if (Number.isFinite(f.minParking) && l.parking < f.minParking) return false;
      if (Number.isFinite(f.maxPrice) && l.price > f.maxPrice) return false;
      if (q && normalize(l.title + ' ' + l.neighborhood).indexOf(q) === -1) return false;
      return true;
    });
  }

  // Monthly cost of holding the property: rent + condo + IPTU for rentals,
  // condo + IPTU only for sales (price is a one-off amount).
  function monthlyCost(listing) {
    var fees = listing.condo + listing.iptu;
    return listing.modality === 'aluguel' ? listing.price + fees : fees;
  }

  // Price per m² in BRL cents, rounded.
  function pricePerM2(listing) {
    return Math.round(listing.price / listing.areaM2);
  }

  function formatBRL(cents) {
    var v = (cents / 100).toFixed(2).replace('.', ',');
    return 'R$ ' + v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function formatArea(m2) {
    return String(m2).replace('.', ',') + ' m²';
  }

  var api = {
    TYPES: TYPES, MODALITIES: MODALITIES, NEIGHBORHOODS: NEIGHBORHOODS, LISTINGS: LISTINGS,
    byId: byId, typeById: typeById, isCommercial: isCommercial, filterListings: filterListings,
    monthlyCost: monthlyCost, pricePerM2: pricePerM2, formatBRL: formatBRL, formatArea: formatArea,
  };
  root.ImoveisListings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
