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

    it('should return 0 scores if quizAnswers length does not match totalLessons', () => {
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
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(0)
      expect(result.scorePercent).toBe(0)
      expect(result.passed).toBe(false)
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

    it('should calculate scorePercent correctly and pass exactly at 70% boundary', () => {
      // Create a track with 10 lessons so we can test exactly 70%
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
        quizAnswers: [true, true, true, true, true, true, true, false, false, false] // 7/10 = 70%
      }
      const result = evaluateTrackProgress(input)
      expect(result.scorePercent).toBe(70)
      expect(result.passed).toBe(true)
    })
    
    it('should calculate scorePercent correctly and fail just below 70% boundary', () => {
      // 2/3 = 66.6%
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
        quizAnswers: [true, true, false] // 2/3 = ~66.6%
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
        quizAnswers: [true, true] // 100% score
      }
      const cert = issueTrackCertificate(input, 'user-123')
      expect(cert).not.toBeNull()
      expect(cert).toMatch(/^ACD-[a-zA-Z0-9]{10}$/i) // ACD- + 6 char hash + random = 14 total len
    })

    it('should not issue certificate if quizAnswers is empty (returns null because length mismatch)', () => {
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
        quizAnswers: [] // Empty quiz answers
      }
      const cert = issueTrackCertificate(input, 'user-123')
      expect(cert).toBeNull()
    })
    
    it('should throw if trackId is unknown', () => {
      vi.mocked(getTrackById).mockReturnValue(undefined)
      const input: EvaluateTrackProgressInput = {
        trackId: 'invalid',
        completedLessonIds: [],
        quizAnswers: []
      }
      expect(() => issueTrackCertificate(input, 'user-123')).toThrowError('Track not found: invalid')
    })
    
    it('should generate deterministic portion of certificate based on trackId and userId', () => {
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
      
      // Spy on crypto.randomUUID to ensure deterministic tests for the random part
      vi.stubGlobal('crypto', {
        randomUUID: () => '1234abcd-0000-0000-0000-000000000000'
      })
      
      const cert1 = issueTrackCertificate(input, 'user-123')
      const cert2 = issueTrackCertificate(input, 'user-123')
      
      expect(cert1).toBe(cert2)
      // Hash of "t1:::user-123" + first part of fake UUID
      expect(cert1).toBe('ACD-2860211234') // length 14: ACD-(4) + 286021(6) + 1234(4)
      
      // We still use same mock for cert3, but hash part should change for user-456
      const cert3 = issueTrackCertificate(input, 'user-456')
      expect(cert1).not.toBe(cert3)
      expect(cert3).toBe('ACD-28602D1234')
    })
  })
})
