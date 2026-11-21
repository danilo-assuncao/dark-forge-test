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
  let amenitiesSubtotal = 0;

  for (const id of amenityIds) {
    const amenity = AMENITIES[id];
    if (amenity) {
      if (amenity.type === 'per_attendee') {
        amenitiesSubtotal += amenity.price * attendees;
      } else if (amenity.type === 'fixed') {
        amenitiesSubtotal += amenity.price;
      }
    }
  }

  let subtotal = slotSubtotalBrl + amenitiesSubtotal;
  let discount = 0;

  if (couponCode === 'DANHUB15') {
    discount = subtotal * 0.15;
  }

  let total = subtotal - discount;

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
