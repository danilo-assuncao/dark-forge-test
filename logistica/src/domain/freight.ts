import { findRoute } from '../data/zones'

export interface FreightQuoteInput {
  originUf: string
  destUf: string
  actualWeightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  declaredValueBrl: number
  quantity: number
  coupon?: string
}

export interface FreightQuoteResult {
  volumetricWeightKg: number
  billableWeightKg: number
  baseFreight: number
  adValoremCost: number
  corporateDiscount: number
  couponDiscount: number
  totalFreight: number
  shippingLabel?: string
}

export const calculateFreightQuote = (input: FreightQuoteInput): FreightQuoteResult => {
  const route = findRoute(input.originUf, input.destUf)
  if (!route) {
    throw new Error(`Route not found for ${input.originUf} to ${input.destUf}`)
  }

  const volumetricWeightKg = (input.lengthCm * input.widthCm * input.heightCm) / 6000
  const billableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg)
  
  const totalBillableWeight = billableWeightKg * input.quantity
  const baseFreight = route.baseCost * totalBillableWeight

  const adValoremCost = input.declaredValueBrl * 0.008

  let corporateDiscount = 0
  if (input.quantity >= 5) {
    corporateDiscount = baseFreight * 0.10
  }

  let couponDiscount = 0
  let shippingLabel: string | undefined

  if (input.coupon === 'DANCARGO10') {
    couponDiscount = baseFreight * 0.10
    shippingLabel = 'CRG-XXXX'
  }

  const totalFreight = baseFreight + adValoremCost - corporateDiscount - couponDiscount

  return {
    volumetricWeightKg,
    billableWeightKg,
    baseFreight,
    adValoremCost,
    corporateDiscount,
    couponDiscount,
    totalFreight,
    shippingLabel
  }
}
