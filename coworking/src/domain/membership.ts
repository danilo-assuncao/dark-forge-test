import { WorkspaceItem } from '../types';

export type PlanType = 'avulso' | 'resident' | 'enterprise';

export interface BookingInput {
  workspace: WorkspaceItem;
  hours: number;
  plan: PlanType;
  coupon?: string;
  generateAccessCode?: () => string;
}

export interface BookingResult {
  totalPrice: number;
  accessCode: string;
}

function generateRandomCode(): string {
  const codeNumber = Math.floor(100000 + Math.random() * 900000).toString();
  return `CWK-${codeNumber}`;
}

export function finalizeCoworkingBooking(input: BookingInput): BookingResult {
  const { workspace, hours, plan, coupon, generateAccessCode } = input;

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new RangeError('hours must be a positive finite number');
  }

  if (!Number.isFinite(workspace.pricePerHour) || workspace.pricePerHour < 0) {
    throw new RangeError('workspace.pricePerHour must be a non-negative finite number');
  }

  let billableHours = hours;
  let discountPercentage = 0;

  if (plan === 'enterprise') {
    billableHours = Math.max(0, hours - 2);
    discountPercentage = 0.25;
  } else if (plan === 'resident') {
    discountPercentage = 0.15;
  } else if (plan === 'avulso') {
    if (coupon === 'DANWORK15') {
      discountPercentage = 0.15;
    }
  }

  const basePrice = workspace.pricePerHour * billableHours;
  const rawTotalPrice = basePrice * (1 - discountPercentage);
  const totalPrice = Math.round(rawTotalPrice * 100) / 100;

  const accessCode = generateAccessCode ? generateAccessCode() : generateRandomCode();

  return {
    totalPrice,
    accessCode,
  };
}
