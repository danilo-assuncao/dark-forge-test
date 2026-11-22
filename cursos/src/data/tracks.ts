import { CourseTrack, TrackLevel } from '../types'

const tracks: CourseTrack[] = [
  {
    id: 't1',
    title: 'React Básico',
    level: 'iniciante',
    lessons: [
      { id: 'l1', title: 'O que é React?', durationMinutes: 10 },
      { id: 'l2', title: 'Componentes e Props', durationMinutes: 20 }
    ]
  },
  {
    id: 't2',
    title: 'React Hooks',
    level: 'intermediario',
    lessons: [
      { id: 'l3', title: 'useState na prática', durationMinutes: 15 },
      { id: 'l4', title: 'useEffect e ciclo de vida', durationMinutes: 25 }
    ]
  },
  {
    id: 't3',
    title: 'Gerenciamento de Estado Avançado',
    level: 'avancado',
    lessons: [
      { id: 'l5', title: 'Context API com reducers', durationMinutes: 30 },
      { id: 'l6', title: 'Zustand vs Redux', durationMinutes: 40 }
    ]
  },
  {
    id: 't4',
    title: 'Next.js Fundamental',
    level: 'iniciante',
    lessons: [
      { id: 'l7', title: 'App Router', durationMinutes: 25 },
      { id: 'l8', title: 'Server Components', durationMinutes: 35 }
    ]
  }
]

export function listTracks(): CourseTrack[] {
  return tracks
}

export function filterTracksByLevel(level: TrackLevel): CourseTrack[] {
  return tracks.filter(t => t.level === level)
}

export function getTrackById(id: string): CourseTrack | undefined {
  return tracks.find(t => t.id === id)
}
