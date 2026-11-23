import { WorkspaceItem } from '../types';

export type AdditionalAmenityId = 
  | 'coffee-break' 
  | 'kit-streaming-4k' 
  | 'quadro-interativo' 
  | 'armario-dia';

export interface AdditionalAmenity {
  id: AdditionalAmenityId;
  name: string;
  price: number;
  type: 'per_person' | 'fixed';
}

export const ADDITIONAL_AMENITIES: AdditionalAmenity[] = [
  { id: 'coffee-break', name: 'Coffee Break', price: 25, type: 'per_person' },
  { id: 'kit-streaming-4k', name: 'Kit Streaming 4K', price: 150, type: 'fixed' },
  { id: 'quadro-interativo', name: 'Quadro Interativo', price: 80, type: 'fixed' },
  { id: 'armario-dia', name: 'Armário Dia', price: 20, type: 'fixed' }
];

export function listAmenities(): AdditionalAmenity[] {
  return [...ADDITIONAL_AMENITIES];
}

export interface QuoteAmenitiesInput {
  space: WorkspaceItem;
  participants: number;
  amenities: AdditionalAmenityId[];
}

export interface QuoteResult {
  total: number;
  details: Array<{
    id: AdditionalAmenityId;
    name: string;
    subtotal: number;
    quantity: number;
  }>;
}

/**
 * Calculates the total cost of additional amenities for a workspace booking.
 * 
 * Fixed amenities are charged once per booking.
 * Per-person amenities are charged based on the participant count. If participants
 * is 0, the space's full capacity is used.
 */
export function quoteAmenities(input: QuoteAmenitiesInput): QuoteResult {
  let total = 0;
  const details = [];

  if (!Number.isInteger(input.participants) || input.participants < 0) {
    throw new Error('Invalid participants count');
  }

  const participantsCount = input.participants === 0 ? input.space.capacity : input.participants;

  if (participantsCount > input.space.capacity) {
    throw new Error('Participants exceed space capacity');
  }

  const uniqueAmenities = Array.from(new Set(input.amenities));

  for (const amenityId of uniqueAmenities) {
    const amenity = ADDITIONAL_AMENITIES.find(a => a.id === amenityId);
    if (!amenity) {
      throw new Error(`Unknown amenity: ${amenityId}`);
    }

    let subtotal = 0;
    let quantity = 0;
    
    if (amenity.type === 'per_person') {
      subtotal = amenity.price * participantsCount;
      quantity = participantsCount;
    } else if (amenity.type === 'fixed') {
      subtotal = amenity.price;
      quantity = 1;
    }

    details.push({
      id: amenity.id,
      name: amenity.name,
      subtotal,
      quantity
    });
    total += subtotal;
  }

  return { total, details };
}
