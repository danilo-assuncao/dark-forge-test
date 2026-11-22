import React, { useState } from 'react';
import { evaluateSymptomTriage } from '../domain/triage';
import type { TriageResult } from '../domain/triage';

export const Triage: React.FC = () => {
  const [chestPain, setChestPain] = useState(false);
  const [highFever, setHighFever] = useState(false);
  const [shortnessOfBreath, setShortnessOfBreath] = useState(false);
  const [durationDays, setDurationDays] = useState(0);
  const [result, setResult] = useState<TriageResult | null>(null);

  const handleTriage = () => {
    const res = evaluateSymptomTriage({
      chestPain,
      highFever,
      shortnessOfBreath,
      durationDays
    });
    setResult(res);
  };

  return (
    <div className="card triage">
      <h3>Assistente de Triagem</h3>
      <div className="form-group">
        <label>
          <input type="checkbox" checked={chestPain} onChange={e => { setChestPain(e.target.checked); setResult(null); }} />
          Dor no peito
        </label>
      </div>
      <div className="form-group">
        <label>
          <input type="checkbox" checked={highFever} onChange={e => { setHighFever(e.target.checked); setResult(null); }} />
          Febre alta
        </label>
      </div>
      <div className="form-group">
        <label>
          <input type="checkbox" checked={shortnessOfBreath} onChange={e => { setShortnessOfBreath(e.target.checked); setResult(null); }} />
          Falta de ar
        </label>
      </div>
      <div className="form-group">
        <label>
          Dias de duração:
          <input type="number" min="0" value={durationDays} onChange={e => { setDurationDays(Number(e.target.value)); setResult(null); }} />
        </label>
      </div>
      <button onClick={handleTriage}>Avaliar Sintomas</button>

      {result && (
        <div className="result triage-result" data-testid="triage-result">
          <p>Prioridade: <strong>{result.priority}</strong></p>
          <p>Especialidade recomendada: <strong>{result.specialty}</strong></p>
        </div>
      )}
    </div>
  );
};
