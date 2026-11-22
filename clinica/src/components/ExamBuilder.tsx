import React, { useState } from 'react';
import { listLabExams, quoteExamBundle } from '../domain/exams';
import type { QuoteResult } from '../domain/exams';

export const ExamBuilder: React.FC = () => {
  const catalog = listLabExams();
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState('');

  const toggleExam = (examId: string) => {
    setSelectedExams(prev => 
      prev.includes(examId) ? prev.filter(id => id !== examId) : [...prev, examId]
    );
  };

  const handleQuote = () => {
    try {
      setError('');
      if (selectedExams.length === 0) {
        throw new Error('Selecione pelo menos um exame');
      }
      const res = quoteExamBundle({
        exams: selectedExams.map(id => ({ examName: id })),
        couponCode: couponCode || undefined
      });
      setQuote(res);
    } catch (e: any) {
      setError(e.message);
      setQuote(null);
    }
  };

  return (
    <div className="card exam-builder">
      <h3>Montador de Check-up</h3>
      <div className="exam-list">
        {catalog.map(exam => (
          <div key={exam.id} className="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={selectedExams.includes(exam.id)} 
                onChange={() => toggleExam(exam.id)} 
              />
              {exam.name} - R$ {exam.price.toFixed(2)} (Jejum: {exam.fastingHours}h)
            </label>
          </div>
        ))}
      </div>
      
      <div className="form-group">
        <label>
          Cupom de Desconto:
          <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Ex: DANMED15" />
        </label>
      </div>

      <button onClick={handleQuote}>Calcular Check-up</button>

      {error && <p className="error" style={{ color: 'red' }}>{error}</p>}

      {quote && (
        <div className="result exam-result" data-testid="exam-result">
          <p>Preço Original: <strong>R$ {quote.originalPrice.toFixed(2)}</strong></p>
          <p>Desconto Aplicado: <strong>R$ {quote.discountApplied.toFixed(2)}</strong></p>
          <p>Preço Final: <strong>R$ {quote.finalPrice.toFixed(2)}</strong></p>
          <p data-testid="fasting-hours">Horas de Jejum Necessárias: <strong>{quote.requiredFastingHours}h</strong></p>
        </div>
      )}
    </div>
  );
};
