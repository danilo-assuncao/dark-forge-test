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

const CONSTANTS = {
  MILES_DIVISOR: 1000,
  MILES_DISCOUNT_RATE: 25,
  MAX_MILES_DISCOUNT_RATIO: 0.5,
  COUPON_CODE: 'DANTRIP10',
  COUPON_DISCOUNT_RATIO: 0.1,
  DEFAULT_EXCHANGE_RATE: 5
};

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function finalizeTripCheckout(input: CheckoutInput): CheckoutResult {
  const { destination, miles, hasTravelInsurance, exchangeRate = CONSTANTS.DEFAULT_EXCHANGE_RATE } = input;
  let { coupon } = input;
  const packageValue = destination.price;

  if (packageValue < 0 || !Number.isFinite(packageValue)) {
    throw new Error('O valor do pacote deve ser um número positivo');
  }

  if (miles < 0 || !Number.isFinite(miles)) {
    throw new Error('A quantidade de milhas deve ser um número positivo');
  }

  if (exchangeRate <= 0 || !Number.isFinite(exchangeRate)) {
    throw new Error('A taxa de câmbio deve ser um número positivo maior que zero');
  }

  if (destination.scope === 'internacional' && !hasTravelInsurance) {
    throw new Error('Seguro viagem é obrigatório para viagens internacionais');
  }

  let milesDiscount = Math.floor(miles / CONSTANTS.MILES_DIVISOR) * CONSTANTS.MILES_DISCOUNT_RATE;
  const maxMilesDiscount = packageValue * CONSTANTS.MAX_MILES_DISCOUNT_RATIO;
  
  if (milesDiscount > maxMilesDiscount) {
    milesDiscount = maxMilesDiscount;
  }

  let balance = packageValue - milesDiscount;
  let couponDiscount = 0;
  
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, '0');
  const locator = `TRP-${randomChars}`;

  if (coupon) {
    coupon = coupon.trim().toUpperCase();
  }

  if (coupon === CONSTANTS.COUPON_CODE) {
    couponDiscount = balance * CONSTANTS.COUPON_DISCOUNT_RATIO;
    balance -= couponDiscount;
  }

  const result: CheckoutResult = {
    finalValue: roundToTwoDecimals(balance),
    milesDiscount: roundToTwoDecimals(milesDiscount),
    couponDiscount: roundToTwoDecimals(couponDiscount),
    insuranceRequired: destination.scope === 'internacional',
    locator
  };

  if (destination.scope === 'internacional') {
    result.exchangeEstimate = roundToTwoDecimals(balance / exchangeRate);
  }

  return result;
}
