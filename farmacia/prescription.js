const { getProductById } = require('./catalog.js');

const VALID_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function validateCartPrescription(cartItems, prescription, referenceDateIso) {
  let requiresPrescription = false;

  if (Array.isArray(cartItems)) {
    for (const item of cartItems) {
      const pId = item.productId || item.id;
      const product = getProductById(pId);
      if (product && product.requiresPrescription) {
        requiresPrescription = true;
        break;
      }
    }
  }

  if (!requiresPrescription) {
    return true;
  }

  if (!prescription) {
    throw new Error('Prescription is required');
  }

  const { crmNumber, uf, issuedAtIso, patientName } = prescription;

  if (!patientName || typeof patientName !== 'string' || patientName.trim() === '') {
    throw new Error('Invalid patientName');
  }

  const crmStr = String(crmNumber);
  if (!/^\d{4,7}$/.test(crmStr)) {
    throw new Error('Invalid crmNumber');
  }

  if (!uf || typeof uf !== 'string' || !VALID_UFS.includes(uf.toUpperCase())) {
    throw new Error('Invalid uf');
  }

  if (!issuedAtIso || Number.isNaN(Date.parse(issuedAtIso))) {
    throw new Error('Invalid issuedAtIso');
  }

  const refTime = Date.parse(referenceDateIso);
  if (Number.isNaN(refTime)) {
    throw new Error('Invalid referenceDateIso');
  }

  const issuedTime = Date.parse(issuedAtIso);
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