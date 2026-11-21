const { getProductById } = require('./catalog.js');

function calculatePharmacyPricing({ items, purchaseMode = 'avulsa', couponCode = '' }) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  let originalTotal = 0;
  let subtotalAfterLines = 0;
  let lineDiscountsTotal = 0;

  for (const item of items) {
    const product = getProductById(item.id);
    if (!product) continue;

    const qty = item.qty || 1;
    if (qty <= 0) continue;

    const lineTotal = product.priceBrl * qty;
    let lineDiscount = 0;

    // Desconto laboratório por item: qty >= 3 do mesmo item recebe 15% de desconto naquela linha
    if (qty >= 3) {
      lineDiscount = lineTotal * 0.15;
    }

    originalTotal += lineTotal;
    lineDiscountsTotal += lineDiscount;
    subtotalAfterLines += (lineTotal - lineDiscount);
  }

  let globalDiscount = 0;

  // Modalidade 'assinatura' concede 12% sobre o subtotal após desconto de linha
  // cupom 'DANFARMA10' concede 10% apenas na modalidade 'avulsa' (não cumulativo com 'assinatura')
  if (purchaseMode === 'assinatura') {
    globalDiscount = subtotalAfterLines * 0.12;
  } else if (purchaseMode === 'avulsa' && couponCode === 'DANFARMA10') {
    globalDiscount = subtotalAfterLines * 0.10;
  }

  const finalPrice = subtotalAfterLines - globalDiscount;

  return {
    originalTotal: Number(originalTotal.toFixed(2)),
    lineDiscountsTotal: Number(lineDiscountsTotal.toFixed(2)),
    subtotalAfterLines: Number(subtotalAfterLines.toFixed(2)),
    globalDiscount: Number(globalDiscount.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2))
  };
}

module.exports = {
  calculatePharmacyPricing
};
