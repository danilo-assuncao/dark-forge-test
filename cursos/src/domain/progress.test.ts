import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { evaluateTrackProgress, issueTrackCertificate, EvaluateTrackProgressInput } from './progress'

// Mock the data module
vi.mock('../data/tracks', () => ({
  getTrackById: vi.fn()
}))

import { getTrackById } from '../data/tracks'

describe('progress domain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('evaluateTrackProgress', () => {
    it('should throw if track is not found', () => {
      vi.mocked(getTrackById).mockReturnValue(undefined)
      const input: EvaluateTrackProgressInput = {
        trackId: 'invalid!@#',
        completedLessonIds: [],
        quizAnswers: []
      }
      expect(() => evaluateTrackProgress(input)).toThrowError('Track not found: invalid')
    })
    
    it('should throw if track has zero lessons', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't-empty',
        title: 'Empty Track',
        level: 'iniciante',
        lessons: []
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't-empty',
        completedLessonIds: [],
        quizAnswers: []
      }
      expect(() => evaluateTrackProgress(input)).toThrowError('Track t-empty has no lessons and cannot be completed')
    })

    it('should throw if quizAnswers length is too short', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [{ id: 'l1', title: 'L1', durationMinutes: 10 }]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: [] // Expected length 1
      }
      expect(() => evaluateTrackProgress(input)).toThrowError('Invalid quiz answers length: expected 1, got 0')
    })

    it('should throw if quizAnswers length is too long', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [{ id: 'l1', title: 'L1', durationMinutes: 10 }]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: [true, false] // Expected length 1
      }
      expect(() => evaluateTrackProgress(input)).toThrowError('Invalid quiz answers length: expected 1, got 2')
    })

    it('should calculate completedPercent correctly for a valid track', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [
          { id: 'l1', title: 'L1', durationMinutes: 10 },
          { id: 'l2', title: 'L2', durationMinutes: 10 }
        ]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: [true, false] // length matches
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(50)
      expect(result.scorePercent).toBe(50)
      expect(result.passed).toBe(false)
    })

    it('should ignore invalid or duplicate lesson ids', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [
          { id: 'l1', title: 'L1', durationMinutes: 10 },
          { id: 'l2', title: 'L2', durationMinutes: 10 }
        ]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l1', 'invalid-lesson'],
        quizAnswers: [true, false]
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(50)
    })

    it('should calculate 100% when all lessons are completed', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [
          { id: 'l1', title: 'L1', durationMinutes: 10 },
          { id: 'l2', title: 'L2', durationMinutes: 10 }
        ]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l2'],
        quizAnswers: [true, true]
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(100)
    })

    it('should compute score separately from completion (e.g. 0% complete but 100% score)', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [{ id: 'l1', title: 'L1', durationMinutes: 10 }]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: [],
        quizAnswers: [true]
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(0)
      expect(result.scorePercent).toBe(100)
      expect(result.passed).toBe(true)
    })

    it('should calculate scorePercent correctly and pass exactly at 70% boundary', () => {
      const lessons = Array.from({ length: 10 }).map((_, i) => ({
        id: `l${i}`, title: `L${i}`, durationMinutes: 10
      }))
      
      vi.mocked(getTrackById).mockReturnValue({
        id: 't10',
        title: 'Track 10',
        level: 'iniciante',
        lessons
      })
      
      const input: EvaluateTrackProgressInput = {
        trackId: 't10',
        completedLessonIds: [],
        quizAnswers: [true, true, true, true, true, true, true, false, false, false]
      }
      const result = evaluateTrackProgress(input)
      expect(result.scorePercent).toBe(70)
      expect(result.passed).toBe(true)
    })
    
    it('should calculate scorePercent correctly and fail just below 70% boundary', () => {
      const lessons = Array.from({ length: 3 }).map((_, i) => ({
        id: `l${i}`, title: `L${i}`, durationMinutes: 10
      }))
      
      vi.mocked(getTrackById).mockReturnValue({
        id: 't3',
        title: 'Track 3',
        level: 'iniciante',
        lessons
      })
      
      const input: EvaluateTrackProgressInput = {
        trackId: 't3',
        completedLessonIds: [],
        quizAnswers: [true, true, false]
      }
      const result = evaluateTrackProgress(input)
      expect(result.scorePercent).toBeCloseTo(66.6666, 3)
      expect(result.passed).toBe(false)
    })
  })

  describe('issueTrackCertificate', () => {
    it('should issue certificate if 100% completed and passed quiz', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [
          { id: 'l1', title: 'L1', durationMinutes: 10 },
          { id: 'l2', title: 'L2', durationMinutes: 10 }
        ]
      })
      
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l2'],
        quizAnswers: [true, true]
      }

      // Mock crypto.getRandomValues
      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = i
        }
      })

      const cert = issueTrackCertificate(input, 'user-123')
      expect(cert).not.toBeNull()
      expect(cert).toMatch(/^ACD-[A-F0-9]{8}-[A-F0-9]{32}$/)
    })

    it('should not issue certificate if completion is 100% but score < 70%', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [
          { id: 'l1', title: 'L1', durationMinutes: 10 },
          { id: 'l2', title: 'L2', durationMinutes: 10 }
        ]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l2'], // 100%
        quizAnswers: [true, false] // 50%
      }
      expect(issueTrackCertificate(input, 'user-123')).toBeNull()
    })

    it('should not issue certificate if score is passing but completion is incomplete', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [
          { id: 'l1', title: 'L1', durationMinutes: 10 },
          { id: 'l2', title: 'L2', durationMinutes: 10 }
        ]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'], // 50%
        quizAnswers: [true, true] // 100% score
      }
      expect(issueTrackCertificate(input, 'user-123')).toBeNull()
    })
    
    it('should not issue a certificate for 199/200 lessons (test rounding boundary)', () => {
      const lessons = Array.from({ length: 200 }).map((_, i) => ({
        id: `l${i}`, title: `L${i}`, durationMinutes: 10
      }))
      vi.mocked(getTrackById).mockReturnValue({
        id: 't200',
        title: 'Track 200',
        level: 'iniciante',
        lessons
      })
      
      const input: EvaluateTrackProgressInput = {
        trackId: 't200',
        completedLessonIds: lessons.slice(0, 199).map(l => l.id), // 199 lessons completed
        quizAnswers: Array(200).fill(true)
      }
      expect(issueTrackCertificate(input, 'user-123')).toBeNull()
    })

    it('should throw if crypto is undefined', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [{ id: 'l1', title: 'L1', durationMinutes: 10 }]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: [true]
      }
      
      vi.stubGlobal('crypto', undefined)
      expect(() => issueTrackCertificate(input, 'user-123')).toThrowError('Secure random number generation is not available')
    })
    
    it('should differ in random portion between two consecutive issuances without stub', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [{ id: 'l1', title: 'L1', durationMinutes: 10 }]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: [true]
      }

      const cert1 = issueTrackCertificate(input, 'user-123')
      const cert2 = issueTrackCertificate(input, 'user-123')
      
      expect(cert1).not.toBeNull()
      expect(cert2).not.toBeNull()
      
      if (cert1 && cert2) {
        const parts1 = cert1.split('-')
        const parts2 = cert2.split('-')
        expect(parts1[1]).toBe(parts2[1]) // Hash matches
        expect(parts1[2]).not.toBe(parts2[2]) // Random differs
      }
    })

    it('should result in different hash portion for different userIds', () => {
      vi.mocked(getTrackById).mockReturnValue({
        id: 't1',
        title: 'Track 1',
        level: 'iniciante',
        lessons: [{ id: 'l1', title: 'L1', durationMinutes: 10 }]
      })
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: [true]
      }

      // Mock crypto to keep the random part deterministic
      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = 0xAB
        }
      })

      const cert1 = issueTrackCertificate(input, 'user-123')
      const cert2 = issueTrackCertificate(input, 'user-456')
      
      expect(cert1).not.toBeNull()
      expect(cert2).not.toBeNull()
      
      if (cert1 && cert2) {
        const parts1 = cert1.split('-')
        const parts2 = cert2.split('-')
        expect(parts1[1]).not.toBe(parts2[1]) // Hash differs
        expect(parts1[2]).toBe(parts2[2]) // Random matches
      }
    })
  })
})
