import { getTrackById } from '../data/tracks'

export type EnrollmentModality = 'passaporte' | 'avulsa'

export interface EnrollmentInput {
  trackIds: readonly string[]
  modality: EnrollmentModality
  isStudentScholarship?: boolean
  coupon?: string
  basePricePerTrack?: number
}

export interface EnrollmentQuote {
  totalOriginal: number
  totalDiscount: number
  totalFinal: number
  appliedDiscounts: readonly string[]
}

const DEFAULT_BASE_PRICE = 1000

export function quoteEnrollment(input: EnrollmentInput): EnrollmentQuote {
  const { trackIds, modality, isStudentScholarship, coupon, basePricePerTrack = DEFAULT_BASE_PRICE } = input

  if (!Number.isFinite(basePricePerTrack) || basePricePerTrack < 0) {
    throw new Error('Invalid basePricePerTrack')
  }

  if (trackIds.length === 0) {
    throw new Error('trackIds cannot be empty')
  }

  const uniqueTrackIds = Array.from(new Set(trackIds))

  // Validate tracks
  const validTracks = uniqueTrackIds.map(id => {
    const track = getTrackById(id)
    if (!track) {
      throw new Error(`Track with id ${id} not found`)
    }
    return track
  })

  let discountPercentage = 0
  const appliedDiscounts: string[] = []

  if (modality === 'passaporte') {
    if (validTracks.length >= 2) {
      discountPercentage += 0.25
      appliedDiscounts.push('PASSAPORTE_25')
    }
  } else if (modality === 'avulsa') {
    if (isStudentScholarship) {
      discountPercentage += 0.15
      appliedDiscounts.push('STUDENT_15')
    }
    const normalizedCoupon = coupon?.trim().toUpperCase()
    if (normalizedCoupon === 'DANEDU20') {
      discountPercentage += 0.20
      appliedDiscounts.push('COUPON_DANEDU20')
    }
  } else {
    throw new Error('Invalid modality')
  }

  // Cap discount at 100% just in case
  if (discountPercentage > 1) {
    discountPercentage = 1
  }

  const totalOriginal = validTracks.length * basePricePerTrack
  const totalDiscount = Math.round(totalOriginal * discountPercentage)
  const totalFinal = totalOriginal - totalDiscount

  return {
    totalOriginal,
    totalDiscount,
    totalFinal,
    appliedDiscounts
  }
}
