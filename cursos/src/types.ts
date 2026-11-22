export type TrackLevel = 'iniciante' | 'intermediario' | 'avancado'

export interface LessonItem {
  id: string
  title: string
  durationMinutes: number
}

export interface CourseTrack {
  id: string
  title: string
  level: TrackLevel
  lessons: LessonItem[]
}

export interface QuizSubmission {
  trackId: string
  score: number
  passed: boolean
}
