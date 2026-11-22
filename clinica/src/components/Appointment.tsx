import React, { useState } from 'react';
import { listDoctors, filterDoctorsBySpecialty } from '../data/doctors';
import { quoteAppointment } from '../domain/appointments';
import type { QuoteResult, AppointmentMode, HealthPlan } from '../domain/appointments';
import type { Specialty } from '../types';

export const Appointment: React.FC = () => {
  const [specialty, setSpecialty] = useState<Specialty | ''>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [mode, setMode] = useState<AppointmentMode>('presencial');
  const [plan, setPlan] = useState<HealthPlan>('particular');
  const [basePrice, setBasePrice] = useState<number>(100);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string>('');

  const filteredDoctors = specialty ? filterDoctorsBySpecialty(specialty as Specialty) : listDoctors();

  const handleQuote = () => {
    try {
      setError('');
      const res = quoteAppointment({
        doctorId,
        mode,
        plan,
        basePrice
      });
      setQuote(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setQuote(null);
    }
  };

  return (
    <div className="card appointment">
      <h3>Agendamento de Consultas</h3>
      <div className="form-group">
        <label htmlFor="specialty">Especialidade:</label>
        <select id="specialty" value={specialty} onChange={e => {
          setSpecialty(e.target.value as Specialty | '');
          setDoctorId('');
          setQuote(null);
        }}>
          <option value="">Todas</option>
          <option value="cardiologia">Cardiologia</option>
          <option value="dermatologia">Dermatologia</option>
          <option value="ortopedia">Ortopedia</option>
          <option value="clinica-geral">Clínica Geral</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="doctor">Médico:</label>
        <select id="doctor" value={doctorId} onChange={e => { setDoctorId(e.target.value); setQuote(null); }}>
          <option value="">Selecione...</option>
          {filteredDoctors.map(doc => (
            <option key={doc.id} value={doc.id} disabled={!doc.active}>
              {doc.name} ({doc.crm}) {!doc.active && '- Inativo'}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="mode">Modalidade:</label>
        <select id="mode" value={mode} onChange={e => { setMode(e.target.value as AppointmentMode); setQuote(null); }}>
          <option value="presencial">Presencial</option>
          <option value="telemedicina">Telemedicina</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="plan">Plano de Saúde:</label>
        <select id="plan" value={plan} onChange={e => { setPlan(e.target.value as HealthPlan); setQuote(null); }}>
          <option value="particular">Particular</option>
          <option value="convenio-basico">Convênio Básico</option>
          <option value="convenio-plus">Convênio Plus</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="basePrice">Preço Base (R$):</label>
        <input id="basePrice" type="number" min="0" value={basePrice} onChange={e => { setBasePrice(Number(e.target.value)); setQuote(null); }} />
      </div>
      
      <button onClick={handleQuote} disabled={!doctorId}>Cotar e Agendar</button>

      {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
      
      {quote && (
        <div className="result appointment-result" data-testid="appointment-result">
          <p>Confirmação: <strong>{quote.protocol}</strong></p>
          <p>Médico: <strong>{quote.doctorName}</strong></p>
          <p>Preço Final: <strong>R$ {quote.finalPrice.toFixed(2)}</strong></p>
        </div>
      )}
    </div>
  );
};
