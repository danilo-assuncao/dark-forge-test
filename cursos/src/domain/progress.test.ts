import { describe, it, expect } from 'vitest'
import { evaluateTrackProgress, issueTrackCertificate, EvaluateTrackProgressInput } from './progress'

describe('progress domain', () => {
  describe('evaluateTrackProgress', () => {
    it('should throw if track is not found', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 'invalid',
        completedLessonIds: [],
        quizAnswers: []
      }
      expect(() => evaluateTrackProgress(input)).toThrowError('Track with id invalid not found')
    })

    it('should calculate completedPercent correctly for a valid track', () => {
      // track 't1' has 2 lessons: 'l1', 'l2'
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'],
        quizAnswers: []
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(50)
      expect(result.scorePercent).toBe(0)
      expect(result.passed).toBe(false)
    })

    it('should ignore invalid or duplicate lesson ids', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l1', 'invalid-lesson'],
        quizAnswers: []
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(50)
    })

    it('should calculate 100% when all lessons are completed', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l2'],
        quizAnswers: []
      }
      const result = evaluateTrackProgress(input)
      expect(result.completedPercent).toBe(100)
    })

    it('should calculate scorePercent correctly and not pass if under 70', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: [],
        quizAnswers: [true, false, false, true] // 2/4 = 50%
      }
      const result = evaluateTrackProgress(input)
      expect(result.scorePercent).toBe(50)
      expect(result.passed).toBe(false)
    })

    it('should calculate scorePercent correctly and pass if >= 70', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: [],
        quizAnswers: [true, true, true, false] // 3/4 = 75%
      }
      const result = evaluateTrackProgress(input)
      expect(result.scorePercent).toBe(75)
      expect(result.passed).toBe(true)
    })
  })

  describe('issueTrackCertificate', () => {
    it('should issue certificate if 100% completed and passed quiz', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l2'],
        quizAnswers: [true, true, true] // 100% score
      }
      const cert = issueTrackCertificate(input)
      expect(cert).not.toBeNull()
      expect(cert).toMatch(/^ACD-[A-Z0-9]{4}$/)
    })

    it('should not issue certificate if not 100% completed', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1'], // only 50%
        quizAnswers: [true, true, true]
      }
      const cert = issueTrackCertificate(input)
      expect(cert).toBeNull()
    })

    it('should not issue certificate if score is < 70', () => {
      const input: EvaluateTrackProgressInput = {
        trackId: 't1',
        completedLessonIds: ['l1', 'l2'], // 100%
        quizAnswers: [true, false, false] // 33%
      }
      const cert = issueTrackCertificate(input)
      expect(cert).toBeNull()
    })
  })
})
