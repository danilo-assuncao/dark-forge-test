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
  const track = getTrackById(input.trackId)
  if (!track) {
    throw new Error(`Track with id ${input.trackId} not found`)
  }

  const totalLessons = track.lessons.length
  let completedPercent = 0
  
  if (totalLessons > 0) {
    const validCompleted = input.completedLessonIds.filter(id => 
      track.lessons.some(l => l.id === id)
    )
    const uniqueCompleted = new Set(validCompleted)
    completedPercent = (uniqueCompleted.size / totalLessons) * 100
  } else {
    completedPercent = 100
  }

  let scorePercent = 0
  if (input.quizAnswers.length > 0) {
    const correctCount = input.quizAnswers.filter(a => a === true).length
    scorePercent = (correctCount / input.quizAnswers.length) * 100
  }

  const passed = scorePercent >= 70

  return {
    completedPercent,
    scorePercent,
    passed
  }
}

export function issueTrackCertificate(input: EvaluateTrackProgressInput): string | null {
  const progress = evaluateTrackProgress(input)
  
  if (progress.completedPercent === 100 && progress.passed) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `ACD-${code}`
  }
  
  return null
}
