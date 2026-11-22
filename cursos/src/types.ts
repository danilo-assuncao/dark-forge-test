export type TrackLevel = 'iniciante' | 'intermediario' | 'avancado'

export interface LessonItem {
  readonly id: string
  readonly title: string
  readonly durationMinutes: number
}

export interface CourseTrack {
  readonly id: string
  readonly title: string
  readonly level: TrackLevel
  readonly lessons: readonly LessonItem[]
}

export interface QuizSubmission {
  readonly trackId: string
  readonly score: number
  readonly passed: boolean
}
