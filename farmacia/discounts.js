const { getProductById } = require('./catalog.js');

function calculatePharmacyPricing({ items, purchaseMode = 'avulsa', couponCode = '' }) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  if (purchaseMode !== 'avulsa' && purchaseMode !== 'assinatura') {
    throw new Error('Invalid purchaseMode');
  }

  const normalizedCoupon = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';

  let originalTotalCents = 0;
  let lineDiscountsTotalCents = 0;
  let subtotalAfterLinesCents = 0;

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item');
    }

    const product = getProductById(item.id);
    if (!product) {
      throw new Error(`Product not found: ${item.id}`);
    }

    const qty = item.qty !== undefined ? item.qty : 1;
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
      throw new Error(`Invalid quantity for product ${item.id}`);
    }

    const priceCents = Math.round(product.priceBrl * 100);
    const lineTotalCents = priceCents * qty;
    let lineDiscountCents = 0;

    // Desconto laboratório por item: qty >= 3 do mesmo item recebe 15% de desconto naquela linha
    if (qty >= 3) {
      lineDiscountCents = Math.round(lineTotalCents * 0.15);
    }

    originalTotalCents += lineTotalCents;
    lineDiscountsTotalCents += lineDiscountCents;
    subtotalAfterLinesCents += (lineTotalCents - lineDiscountCents);
  }

  let globalDiscountCents = 0;

  // Modalidade 'assinatura' concede 12% sobre o subtotal após desconto de linha
  // cupom 'DANFARMA10' concede 10% apenas na modalidade 'avulsa' (não cumulativo com 'assinatura')
  if (purchaseMode === 'assinatura') {
    globalDiscountCents = Math.round(subtotalAfterLinesCents * 0.12);
  } else if (purchaseMode === 'avulsa' && normalizedCoupon === 'DANFARMA10') {
    globalDiscountCents = Math.round(subtotalAfterLinesCents * 0.10);
  }

  const finalPriceCents = subtotalAfterLinesCents - globalDiscountCents;

  return {
    originalTotal: originalTotalCents / 100,
    lineDiscountsTotal: lineDiscountsTotalCents / 100,
    subtotalAfterLines: subtotalAfterLinesCents / 100,
    globalDiscount: globalDiscountCents / 100,
    finalPrice: finalPriceCents / 100
  };
}

module.exports = {
  calculatePharmacyPricing
};
