import { findRoute } from '../data/zones'
import type { ShippingMode } from '../types'

export interface FreightQuoteInput {
  originUf: string
  destUf: string
  actualWeightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  /** The total declared value of the shipment (for all quantities combined). */
  declaredValueBrl: number
  quantity: number
  coupon?: string
  mode?: ShippingMode
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

const round = (val: number) => Math.round(val * 100) / 100

export const calculateFreightQuote = (input: FreightQuoteInput): FreightQuoteResult => {
  if (
    !Number.isFinite(input.actualWeightKg) || input.actualWeightKg <= 0 ||
    !Number.isFinite(input.lengthCm) || input.lengthCm <= 0 ||
    !Number.isFinite(input.widthCm) || input.widthCm <= 0 ||
    !Number.isFinite(input.heightCm) || input.heightCm <= 0
  ) {
    throw new Error('Peso e dimensões devem ser números positivos.')
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error('A quantidade deve ser um número inteiro positivo.')
  }

  if (!Number.isFinite(input.declaredValueBrl) || input.declaredValueBrl < 0) {
    throw new Error('O valor declarado deve ser um número não-negativo.')
  }

  const route = findRoute(input.originUf, input.destUf)
  if (!route) {
    throw new Error(`Rota não encontrada para ${input.originUf} até ${input.destUf}.`)
  }

  const volumetricWeightKg = (input.lengthCm * input.widthCm * input.heightCm) / 6000
  const billableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg)
  
  const totalBillableWeight = billableWeightKg * input.quantity
  
  const mode = input.mode || 'economico'
  let modeMultiplier = 1
  if (mode === 'expresso') modeMultiplier = 1.5
  if (mode === 'aereo-proximo-dia') modeMultiplier = 2.5

  const baseFreight = round(route.baseCost * totalBillableWeight * modeMultiplier)

  const adValoremCost = round(input.declaredValueBrl * 0.008)

  let corporateDiscount = 0
  if (input.quantity >= 5) {
    corporateDiscount = round(baseFreight * 0.10)
  }

  let couponDiscount = 0
  let shippingLabel: string | undefined

  if (input.coupon === 'DANCARGO10') {
    couponDiscount = round(baseFreight * 0.10)
    shippingLabel = 'CRG-XXXX'
  }

  const totalFreight = round(Math.max(0, baseFreight + adValoremCost - corporateDiscount - couponDiscount))

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
