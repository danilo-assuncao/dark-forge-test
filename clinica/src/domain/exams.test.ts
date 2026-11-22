import { describe, it, expect } from 'vitest';
import { listLabExams, quoteExamBundle } from './exams';

describe('listLabExams', () => {
  it('should return the exam catalog', () => {
    const catalog = listLabExams();
    expect(catalog.length).toBe(4);
    expect(catalog.find(e => e.id === 'hemograma')).toBeDefined();
    expect(catalog.find(e => e.id === 'perfil-lipidico')).toBeDefined();
    expect(catalog.find(e => e.id === 'glicemia')).toBeDefined();
    expect(catalog.find(e => e.id === 'eletrocardiograma')).toBeDefined();
  });
});

describe('quoteExamBundle', () => {
  it('should quote a single exam without discount', () => {
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }] }); // price: 50, fasting: 0
    expect(result.originalPrice).toBe(50);
    expect(result.finalPrice).toBe(50);
    expect(result.discountApplied).toBe(0);
    expect(result.requiredFastingHours).toBe(0);
  });

  it('should quote multiple exams and consolidate the highest fasting hours', () => {
    // hemograma (50, 0), perfil-lipidico (100, 12), total 150
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'perfil-lipidico' }] });
    expect(result.originalPrice).toBe(150);
    expect(result.finalPrice).toBe(150);
    expect(result.discountApplied).toBe(0);
    expect(result.requiredFastingHours).toBe(12);
  });

  it('should apply a 10% discount for 3+ exams', () => {
    // hemograma (50), perfil-lipidico (100), glicemia (30) = 180
    // discount 10% = 18. final = 162
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'perfil-lipidico' }, { examName: 'glicemia' }] });
    expect(result.originalPrice).toBe(180);
    expect(result.finalPrice).toBe(162);
    expect(result.discountApplied).toBe(18);
    expect(result.requiredFastingHours).toBe(12);
  });

  it('should apply the DANMED15 coupon for 15% discount', () => {
    // hemograma (50). 15% discount = 7.5. final = 42.5
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }], couponCode: 'DANMED15' });
    expect(result.originalPrice).toBe(50);
    expect(result.finalPrice).toBe(42.5);
    expect(result.discountApplied).toBe(7.5);
  });

  it('should apply both discounts sequentially', () => {
    // 3 exams: 180. 
    // 10% off -> 162. 
    // 15% off of 162 -> 24.3. final = 137.7
    // total discount = 180 - 137.7 = 42.3
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'perfil-lipidico' }, { examName: 'glicemia' }], couponCode: 'DANMED15' });
    expect(result.originalPrice).toBe(180);
    expect(result.finalPrice).toBe(137.7);
    expect(result.discountApplied).toBe(42.3);
  });

  it('should throw an error for invalid exams', () => {
    expect(() => quoteExamBundle({ exams: [{ examName: 'invalid-exam' }] })).toThrow('Exam not found in catalog: invalid-exam');
  });
});
