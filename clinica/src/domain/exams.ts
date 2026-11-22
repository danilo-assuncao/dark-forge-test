import type { LabExam } from '../types';

export interface ExamCatalogItem {
  id: string; // This corresponds to the catalog ID
  name: string;
  price: number;
  fastingHours: number;
}

export const EXAM_CATALOG: ExamCatalogItem[] = [
  { id: 'hemograma', name: 'Hemograma', price: 50, fastingHours: 0 },
  { id: 'perfil-lipidico', name: 'Perfil Lipídico', price: 100, fastingHours: 12 },
  { id: 'glicemia', name: 'Glicemia', price: 30, fastingHours: 8 },
  { id: 'eletrocardiograma', name: 'Eletrocardiograma', price: 150, fastingHours: 0 },
];

export function listLabExams(): ExamCatalogItem[] {
  return EXAM_CATALOG;
}

export interface QuoteInput {
  // Consuming LabExam from types.ts to strongly type the incoming requests
  exams: Array<Pick<LabExam, 'examName'>>;
  couponCode?: string;
}

export interface QuoteResult {
  originalPrice: number;
  finalPrice: number;
  discountApplied: number;
  requiredFastingHours: number;
}

export function quoteExamBundle(input: QuoteInput): QuoteResult {
  let originalPrice = 0;
  let requiredFastingHours = 0;

  for (const requestedExam of input.exams) {
    const exam = EXAM_CATALOG.find(e => e.id === requestedExam.examName || e.name === requestedExam.examName);
    if (!exam) {
      throw new Error(`Exam not found in catalog: ${requestedExam.examName}`);
    }
    
    originalPrice += exam.price;
    if (exam.fastingHours > requiredFastingHours) {
      requiredFastingHours = exam.fastingHours;
    }
  }

  let finalPrice = originalPrice;

  // 3+ exams = 10% off
  if (input.exams.length >= 3) {
    finalPrice -= originalPrice * 0.10;
  }

  // Coupon 'DANMED15' = 15% off sequentially
  if (input.couponCode === 'DANMED15') {
    finalPrice -= finalPrice * 0.15;
  }

  return {
    originalPrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountApplied: Math.round((originalPrice - finalPrice) * 100) / 100,
    requiredFastingHours
  };
}
