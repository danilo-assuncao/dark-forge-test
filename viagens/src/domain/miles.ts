import type { TravelDestination } from '../types';

export interface CheckoutInput {
  destination: TravelDestination;
  miles: number;
  hasTravelInsurance?: boolean;
  coupon?: string;
  exchangeRate?: number;
}

export interface CheckoutResult {
  finalValue: number;
  milesDiscount: number;
  couponDiscount: number;
  insuranceRequired: boolean;
  exchangeEstimate?: number;
  locator?: string;
}

export function finalizeTripCheckout(input: CheckoutInput): CheckoutResult {
  const { destination, miles, hasTravelInsurance, coupon, exchangeRate = 5 } = input;
  const packageValue = destination.price;

  if (destination.scope === 'internacional' && !hasTravelInsurance) {
    throw new Error('Seguro viagem é obrigatório para viagens internacionais');
  }

  let milesDiscount = Math.floor(miles / 1000) * 25;
  const maxMilesDiscount = packageValue * 0.5;
  
  if (milesDiscount > maxMilesDiscount) {
    milesDiscount = maxMilesDiscount;
  }

  let balance = packageValue - milesDiscount;
  let couponDiscount = 0;
  let locator: string | undefined;

  if (coupon === 'DANTRIP10') {
    couponDiscount = balance * 0.1;
    balance -= couponDiscount;
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, '0');
    locator = `TRP-${randomChars}`;
  }

  const result: CheckoutResult = {
    finalValue: balance,
    milesDiscount,
    couponDiscount,
    insuranceRequired: destination.scope === 'internacional',
    locator
  };

  if (destination.scope === 'internacional') {
    result.exchangeEstimate = balance / exchangeRate;
  }

  return result;
}
