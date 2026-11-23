import { getSpaceById } from '../data/spaces';
import { WorkspaceItem } from '../types';

export interface BookingInput {
  spaceId: string;
  hours: number;
  participants: number;
}

export interface BookingResult {
  success: boolean;
  totalAmount?: number;
  isDaily?: boolean;
  discount?: number;
  baseAmount?: number;
  error?: string;
}

export function calculateSpaceRental(input: BookingInput): BookingResult {
  const { spaceId, hours, participants } = input;

  if (hours <= 0) {
    return { success: false, error: 'Hours must be greater than zero' };
  }

  const space: WorkspaceItem | undefined = getSpaceById(spaceId);
  if (!space) {
    return { success: false, error: 'Space not found' };
  }

  if (participants > space.capacity) {
    return { success: false, error: 'Participants exceed space capacity' };
  }

  const baseAmount = space.pricePerHour * hours;
  let isDaily = false;
  let discount = 0;
  let totalAmount = baseAmount;

  if (hours >= 8) {
    isDaily = true;
    discount = baseAmount * 0.20;
    totalAmount = baseAmount - discount;
  }

  return {
    success: true,
    baseAmount,
    discount,
    isDaily,
    totalAmount
  };
}
