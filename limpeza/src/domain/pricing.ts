export type PackageId = 'standard' | 'heavy' | 'postConstruction'

export type ExtraId = 'windows' | 'oven' | 'fridge' | 'balcony'

export type PackageInfo = {
  id: PackageId
  label: string
  description: string
  /** Price per square metre, in cents. */
  centsPerSqm: number
  /** Minimum charge for the package, in cents. */
  minimumCents: number
}

export type ExtraInfo = {
  id: ExtraId
  label: string
  cents: number
}

export const MIN_AREA = 10
export const MAX_AREA = 1000

export const PACKAGES: readonly PackageInfo[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Routine cleaning: dusting, floors, kitchen and bathrooms.',
    centsPerSqm: 450,
    minimumCents: 12000
  },
  {
    id: 'heavy',
    label: 'Heavy',
    description: 'Deep cleaning of grease, mold and accumulated dirt.',
    centsPerSqm: 750,
    minimumCents: 20000
  },
  {
    id: 'postConstruction',
    label: 'Post-construction',
    description: 'Removal of dust, paint and debris after renovations.',
    centsPerSqm: 1100,
    minimumCents: 35000
  }
]

export const EXTRAS: readonly ExtraInfo[] = [
  { id: 'windows', label: 'Window cleaning', cents: 6000 },
  { id: 'oven', label: 'Inside the oven', cents: 4000 },
  { id: 'fridge', label: 'Inside the fridge', cents: 3500 },
  { id: 'balcony', label: 'Balcony', cents: 5000 }
]

export type Quote = {
  packageId: PackageId
  area: number
  baseCents: number
  extrasCents: number
  totalCents: number
}

export const isValidArea = (area: number): boolean =>
  Number.isFinite(area) && area >= MIN_AREA && area <= MAX_AREA

export const getPackage = (id: PackageId): PackageInfo => {
  const found = PACKAGES.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown package: ${id}`)
  return found
}

/**
 * Calculates a quote. Returns null when the area is outside the supported
 * range. All money is integer cents to avoid floating-point drift.
 */
export const calculateQuote = (
  area: number,
  packageId: PackageId,
  extras: readonly ExtraId[] = []
): Quote | null => {
  if (!isValidArea(area)) return null
  const pkg = getPackage(packageId)
  const baseCents = Math.max(Math.round(area * pkg.centsPerSqm), pkg.minimumCents)
  const unique = [...new Set(extras)]
  const extrasCents = unique.reduce((sum, id) => {
    const extra = EXTRAS.find((e) => e.id === id)
    return sum + (extra ? extra.cents : 0)
  }, 0)
  return { packageId, area, baseCents, extrasCents, totalCents: baseCents + extrasCents }
}

export const formatCents = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
