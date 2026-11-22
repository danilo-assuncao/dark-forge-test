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

  it('should return a copy of the catalog to prevent mutation', () => {
    const catalog = listLabExams();
    catalog[0].price = 999;
    const cleanCatalog = listLabExams();
    expect(cleanCatalog[0].price).not.toBe(999);
  });
});

describe('quoteExamBundle', () => {
  it('should throw an error for empty exam list', () => {
    expect(() => quoteExamBundle({ exams: [] })).toThrow('Exam list cannot be empty.');
  });

  it('should quote a single exam without discount', () => {
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }] }); // price: 50, fasting: 0
    expect(result.originalPrice).toBeCloseTo(50);
    expect(result.finalPrice).toBeCloseTo(50);
    expect(result.discountApplied).toBeCloseTo(0);
    expect(result.requiredFastingHours).toBe(0);
  });

  it('should quote exactly 2 exams without bundle discount', () => {
    // hemograma (50), glicemia (30). total = 80
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'glicemia' }] });
    expect(result.originalPrice).toBeCloseTo(80);
    expect(result.finalPrice).toBeCloseTo(80);
    expect(result.discountApplied).toBeCloseTo(0);
    expect(result.requiredFastingHours).toBe(8);
  });

  it('should return correct fasting hours for glicemia', () => {
    const result = quoteExamBundle({ exams: [{ examName: 'glicemia' }] });
    expect(result.requiredFastingHours).toBe(8);
  });

  it('should look up exams by display name', () => {
    const result = quoteExamBundle({ exams: [{ examName: 'Perfil Lipídico' }] });
    expect(result.originalPrice).toBeCloseTo(100);
    expect(result.requiredFastingHours).toBe(12);
  });

  it('should deduplicate duplicate exams and not give bundle discount for repeats', () => {
    // 3x hemograma = 1 hemograma
    const result = quoteExamBundle({ exams: [
      { examName: 'hemograma' }, 
      { examName: 'hemograma' }, 
      { examName: 'hemograma' }
    ] });
    expect(result.originalPrice).toBeCloseTo(50);
    expect(result.finalPrice).toBeCloseTo(50);
    expect(result.discountApplied).toBeCloseTo(0);
  });

  it('should quote multiple exams and consolidate the highest fasting hours', () => {
    // hemograma (50, 0), perfil-lipidico (100, 12), total 150
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'perfil-lipidico' }] });
    expect(result.originalPrice).toBeCloseTo(150);
    expect(result.finalPrice).toBeCloseTo(150);
    expect(result.discountApplied).toBeCloseTo(0);
    expect(result.requiredFastingHours).toBe(12);
  });

  it('should apply a 10% discount for 3+ distinct exams', () => {
    // hemograma (50), perfil-lipidico (100), glicemia (30) = 180
    // discount 10% = 18. final = 162
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'perfil-lipidico' }, { examName: 'glicemia' }] });
    expect(result.originalPrice).toBeCloseTo(180);
    expect(result.finalPrice).toBeCloseTo(162);
    expect(result.discountApplied).toBeCloseTo(18);
    expect(result.requiredFastingHours).toBe(12);
  });

  it('should apply the DANMED15 coupon for 15% discount', () => {
    // hemograma (50). 15% discount = 7.5. final = 42.5
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }], couponCode: 'DANMED15' });
    expect(result.originalPrice).toBeCloseTo(50);
    expect(result.finalPrice).toBeCloseTo(42.5);
    expect(result.discountApplied).toBeCloseTo(7.5);
  });

  it('should apply the DANMED15 coupon case-insensitively', () => {
    // hemograma (50). 15% discount = 7.5. final = 42.5
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }], couponCode: 'danmed15' });
    expect(result.finalPrice).toBeCloseTo(42.5);
  });

  it('should ignore an unknown coupon code', () => {
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }], couponCode: 'INVALID' });
    expect(result.finalPrice).toBeCloseTo(50);
    expect(result.discountApplied).toBeCloseTo(0);
  });

  it('should apply both discounts sequentially', () => {
    // 3 exams: 180. 
    // 10% off -> 162. 
    // 15% off of 162 -> 24.3. final = 137.7
    // total discount = 180 - 137.7 = 42.3
    const result = quoteExamBundle({ exams: [{ examName: 'hemograma' }, { examName: 'perfil-lipidico' }, { examName: 'glicemia' }], couponCode: 'DANMED15' });
    expect(result.originalPrice).toBeCloseTo(180);
    expect(result.finalPrice).toBeCloseTo(137.7);
    expect(result.discountApplied).toBeCloseTo(42.3);
  });

  it('should throw an error for invalid exams', () => {
    expect(() => quoteExamBundle({ exams: [{ examName: 'invalid-exam' }] })).toThrow('Exam not found in catalog: invalid-exam');
  });
});
