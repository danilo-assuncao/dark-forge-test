export type ShippingMode = 'economico' | 'expresso' | 'aereo-proximo-dia'

export interface ZoneRoute {
  originUf: string
  destUf: string
  baseCost: number
  estimatedDays: number
}

export interface PackageDimensions {
  weight: number
  width: number
  height: number
  depth: number
}

export interface TrackingShipment {
  trackingCode: string
  status: string
  estimatedDeliveryDate: string
  mode: ShippingMode
}
