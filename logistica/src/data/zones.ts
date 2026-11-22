import { ShippingMode, ZoneRoute } from '../types'

const modes: ShippingMode[] = ['economico', 'expresso', 'aereo-proximo-dia']

const routes: ZoneRoute[] = [
  { originUf: 'SP', destUf: 'RJ', baseCost: 50, estimatedDays: 2 },
  { originUf: 'SP', destUf: 'MG', baseCost: 45, estimatedDays: 3 },
  { originUf: 'RJ', destUf: 'MG', baseCost: 60, estimatedDays: 4 },
  { originUf: 'SP', destUf: 'SP', baseCost: 20, estimatedDays: 1 }
]

export const listRoutes = (): ZoneRoute[] => {
  return routes
}

export const listShippingModes = (): ShippingMode[] => {
  return modes
}

export const findRoute = (originUf: string, destUf: string): ZoneRoute | undefined => {
  return routes.find(r => r.originUf === originUf && r.destUf === destUf)
}
