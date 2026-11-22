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

  if (input.quizAnswers.length !== totalLessons) {
    return {
      completedPercent: 0,
      scorePercent: 0,
      passed: false
    }
  }

  const validCompleted = input.completedLessonIds.filter(id => 
    track.lessons.some(l => l.id === id)
  )
  const uniqueCompletedCount = new Set(validCompleted).size
  const completedPercent = (uniqueCompletedCount / totalLessons) * 100

  let scorePercent = 0
  const correctCount = input.quizAnswers.filter(a => a === true).length
  scorePercent = (correctCount / totalLessons) * 100

  const passed = scorePercent >= 70

  return {
    completedPercent,
    scorePercent,
    passed
  }
}

export function issueTrackCertificate(input: EvaluateTrackProgressInput, userId: string): string | null {
  const progress = evaluateTrackProgress(input)
  
  if (Math.round(progress.completedPercent) === 100 && progress.passed) {
    // Generate deterministic certificate code using trackId and userId
    const data = `${input.trackId}:::${userId}`
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    // Add crypto random to make it harder to guess but keep it long enough
    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().split('-')[0]
      : Math.random().toString(36).substring(2, 10).toUpperCase()
      
    // Create a 14-char code
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase().substring(0, 6)
    return `ACD-${hexHash}${randomPart}`.substring(0, 14)
  }
  
  return null
}
