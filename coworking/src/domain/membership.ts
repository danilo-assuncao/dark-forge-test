import { WorkspaceItem } from '../types';

export type PlanType = 'avulso' | 'resident' | 'enterprise';

export interface BookingInput {
  workspace: WorkspaceItem;
  hours: number;
  plan: PlanType;
  coupon?: string;
}

export interface BookingResult {
  totalPrice: number;
  accessCode: string;
}

export function finalizeCoworkingBooking(input: BookingInput): BookingResult {
  const { workspace, hours, plan, coupon } = input;
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
  const totalPrice = basePrice * (1 - discountPercentage);

  const codeNumber = Math.floor(1000 + Math.random() * 9000).toString();
  const accessCode = `CWK-${codeNumber}`;

  return {
    totalPrice,
    accessCode,
  };
}
