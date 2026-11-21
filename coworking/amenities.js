const AMENITIES = {
  'coffee-break': {
    price: 28,
    type: 'per_attendee'
  },
  'kit-video-4k': {
    price: 75,
    type: 'fixed'
  },
  'pack-impressao-50': {
    price: 30,
    type: 'fixed'
  },
  'locker-diario': {
    price: 15,
    type: 'fixed'
  }
};

function listAmenities() {
  return Object.keys(AMENITIES).map(id => ({
    id,
    ...AMENITIES[id]
  }));
}

function calculateWorkspaceOrder({ slotSubtotalBrl, amenityIds = [], attendees = 1, couponCode = '' }) {
  if (typeof slotSubtotalBrl !== 'number' || !Number.isFinite(slotSubtotalBrl) || slotSubtotalBrl < 0) {
    throw new TypeError('slotSubtotalBrl must be a non-negative finite number');
  }

  if (typeof attendees !== 'number' || !Number.isInteger(attendees) || attendees < 1) {
    throw new TypeError('attendees must be an integer greater than or equal to 1');
  }

  if (!Array.isArray(amenityIds)) {
    throw new TypeError('amenityIds must be an array');
  }

  const uniqueAmenityIds = [...new Set(amenityIds)];

  let amenitiesSubtotal = 0;

  for (const id of uniqueAmenityIds) {
    if (Object.hasOwn(AMENITIES, id)) {
      const amenity = AMENITIES[id];
      if (amenity.type === 'per_attendee') {
        amenitiesSubtotal += amenity.price * attendees;
      } else if (amenity.type === 'fixed') {
        amenitiesSubtotal += amenity.price;
      }
    }
  }

  let subtotal = slotSubtotalBrl + amenitiesSubtotal;
  let discount = 0;

  const normalizedCoupon = String(couponCode).trim().toUpperCase();

  if (normalizedCoupon === 'DANHUB15') {
    // calculate discount avoiding floating-point issues by working in cents
    discount = Math.round(subtotal * 100 * 0.15) / 100;
  }

  let total = subtotal - discount;

  // round to deal with floating point subtraction if any
  total = Math.round(total * 100) / 100;

  return {
    slotSubtotalBrl,
    amenitiesSubtotal,
    subtotal,
    discount,
    total
  };
}

module.exports = {
  listAmenities,
  calculateWorkspaceOrder
};
