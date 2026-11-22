import { describe, it, expect } from 'vitest';
import { quoteAppointment } from './appointments';

describe('quoteAppointment', () => {
  it('calculates price for presencial + particular', () => {
    const result = quoteAppointment({
      doctorId: '1', // Dr. João Silva
      mode: 'presencial',
      plan: 'particular',
      basePrice: 100
    });
    
    expect(result.finalPrice).toBe(100);
    expect(result.doctorName).toBe('Dr. João Silva');
    expect(result.protocol).toMatch(/^MED-[A-Z0-9]{4}$/);
  });

  it('calculates price for telemedicina + particular (-15%)', () => {
    const result = quoteAppointment({
      doctorId: '2', // Dra. Maria Souza
      mode: 'telemedicina',
      plan: 'particular',
      basePrice: 100
    });
    
    expect(result.finalPrice).toBe(85);
    expect(result.doctorName).toBe('Dra. Maria Souza');
  });

  it('calculates price for presencial + convenio-basico (30% copay)', () => {
    const result = quoteAppointment({
      doctorId: '1',
      mode: 'presencial',
      plan: 'convenio-basico',
      basePrice: 100
    });
    
    expect(result.finalPrice).toBe(30);
  });

  it('calculates price for telemedicina + convenio-basico (30% copay on discounted price)', () => {
    const result = quoteAppointment({
      doctorId: '1',
      mode: 'telemedicina',
      plan: 'convenio-basico',
      basePrice: 100
    });
    
    // 100 * 0.85 = 85
    // 85 * 0.30 = 25.5
    expect(result.finalPrice).toBe(25.5);
  });

  it('calculates price for convenio-plus (0 copay) presencial', () => {
    const result = quoteAppointment({
      doctorId: '4',
      mode: 'presencial',
      plan: 'convenio-plus',
      basePrice: 200
    });
    
    expect(result.finalPrice).toBe(0);
  });

  it('calculates price for convenio-plus (0 copay) telemedicina', () => {
    const result = quoteAppointment({
      doctorId: '4',
      mode: 'telemedicina',
      plan: 'convenio-plus',
      basePrice: 200
    });
    
    expect(result.finalPrice).toBe(0);
  });

  it('throws error if doctor not found', () => {
    expect(() => {
      quoteAppointment({
        doctorId: '999',
        mode: 'presencial',
        plan: 'particular',
        basePrice: 100
      });
    }).toThrow('Doctor not found');
  });
});
