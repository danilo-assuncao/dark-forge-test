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

  if (!Number.isFinite(hours) || hours <= 0) {
    return { success: false, error: 'Hours must be greater than zero and finite' };
  }

  if (!Number.isInteger(participants) || participants < 1) {
    return { success: false, error: 'Participants must be a positive integer' };
  }

  const space: WorkspaceItem | undefined = getSpaceById(spaceId);
  if (!space) {
    return { success: false, error: 'Space not found' };
  }

  if (participants > space.capacity) {
    return { success: false, error: 'Participants exceed space capacity' };
  }

  const baseAmount = Math.round((space.pricePerHour * hours) * 100) / 100;
  let isDaily = false;
  let discount = 0;
  let totalAmount = baseAmount;

  if (hours >= 8) {
    isDaily = true;
    discount = Math.round((baseAmount * 0.20) * 100) / 100;
    totalAmount = Math.round((baseAmount - discount) * 100) / 100;
  }

  return {
    success: true,
    baseAmount,
    discount,
    isDaily,
    totalAmount
  };
}
