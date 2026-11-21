const { getProductById } = require('./catalog.js');

const VALID_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

/**
 * Validates a prescription for a cart. 
 * Note: This is a format-only check. It does not verify the CRM against a registry,
 * check a digital signature, or bind the prescription to the buyer.
 */
function validateCartPrescription(cartItems, prescription, referenceDateIso) {
  if (!Array.isArray(cartItems)) {
    throw new Error('cartItems must be an array');
  }

  let requiresPrescription = false;

  for (const item of cartItems) {
    if (!item || typeof item !== 'object') {
      throw new Error('Cart item must be an object');
    }
    
    const pId = item.id;
    if (typeof pId !== 'string') {
      throw new Error('Cart item id must be a string');
    }

    const product = getProductById(pId);
    if (!product) {
      throw new Error(`Unknown product id: ${pId}`);
    }

    if (product.requiresPrescription) {
      requiresPrescription = true;
    }
  }

  // Reference date handling first (F-360a6a)
  const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  
  const refDateStr = referenceDateIso !== undefined ? referenceDateIso : new Date().toISOString();
  if (typeof refDateStr !== 'string' || !ISO_REGEX.test(refDateStr)) {
    throw new Error('Invalid referenceDateIso');
  }
  const refTime = Date.parse(refDateStr);
  if (Number.isNaN(refTime)) {
    throw new Error('Invalid referenceDateIso');
  }

  if (!requiresPrescription) {
    return true;
  }

  if (!prescription) {
    throw new Error('Prescription is required');
  }

  const { crmNumber, uf, issuedAtIso, patientName } = prescription;

  if (!patientName || typeof patientName !== 'string' || patientName.trim() === '' || patientName.length > 255) {
    throw new Error('Invalid patientName');
  }

  if (typeof crmNumber !== 'string' && typeof crmNumber !== 'number') {
    throw new Error('Invalid crmNumber');
  }
  const crmStr = String(crmNumber);
  if (!/^\d{4,7}$/.test(crmStr)) {
    throw new Error('Invalid crmNumber');
  }

  if (!uf || typeof uf !== 'string' || !VALID_UFS.includes(uf.toUpperCase())) {
    throw new Error('Invalid uf');
  }

  if (typeof issuedAtIso !== 'string' || !ISO_REGEX.test(issuedAtIso)) {
    throw new Error('Invalid issuedAtIso');
  }
  
  const issuedTime = Date.parse(issuedAtIso);
  if (Number.isNaN(issuedTime)) {
    throw new Error('Invalid issuedAtIso');
  }

  const diffTime = refTime - issuedTime;

  if (diffTime < 0) {
    throw new Error('Prescription cannot be issued in the future');
  }

  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  if (diffDays > 30) {
    throw new Error('Prescription is expired (older than 30 days)');
  }

  return true;
}

module.exports = {
  validateCartPrescription
};