import { getTrackById } from '../data/tracks'

export interface EvaluateTrackProgressInput {
  trackId: string
  completedLessonIds: readonly string[]
  quizAnswers: readonly boolean[]
}

export interface EvaluateTrackProgressResult {
  completedPercent: number
  scorePercent: number
  passed: boolean
}

export function evaluateTrackProgress(input: EvaluateTrackProgressInput): EvaluateTrackProgressResult {
  // Sanitize trackId for error messages
  const sanitizedTrackId = input.trackId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50)
  
  const track = getTrackById(input.trackId)
  if (!track) {
    throw new Error(`Track not found: ${sanitizedTrackId}`)
  }

  const totalLessons = track.lessons.length
  
  if (totalLessons === 0) {
    throw new Error(`Track ${sanitizedTrackId} has no lessons and cannot be completed`)
  }

  const validCompleted = input.completedLessonIds.filter(id => 
    track.lessons.some(l => l.id === id)
  )
  const uniqueCompletedCount = new Set(validCompleted).size
  const completedPercent = (uniqueCompletedCount / totalLessons) * 100

  // The quiz answers length must match the number of lessons exactly
  if (input.quizAnswers.length !== totalLessons) {
    throw new Error(`Invalid quiz answers length: expected ${totalLessons}, got ${input.quizAnswers.length}`)
  }

  const correctCount = input.quizAnswers.filter(a => a === true).length
  const scorePercent = (correctCount / totalLessons) * 100

  const passed = scorePercent >= 70

  return {
    completedPercent,
    scorePercent,
    passed
  }
}

export function issueTrackCertificate(input: EvaluateTrackProgressInput, userId: string): string | null {
  const progress = evaluateTrackProgress(input)
  
  // Use exact equality / >= 100 to avoid floating point rounding giving certificates to incomplete tracks
  if (progress.completedPercent >= 100 && progress.passed) {
    // Generate deterministic hash prefix using unambiguous encoding
    const data = JSON.stringify([input.trackId, userId])
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()
    
    // Fallback path is removed. A CSPRNG is strictly required.
    if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues === 'undefined') {
      throw new Error('Secure random number generation is not available')
    }
    
    // Generate 128-bit random hex string for unguessable certificate code
    const array = new Uint8Array(16)
    globalThis.crypto.getRandomValues(array)
    const randomHex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
      
    return `ACD-${hexHash}-${randomHex}`
  }
  
  return null
}
