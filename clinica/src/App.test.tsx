import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

describe('SPA Dan Med App Integration', () => {
  it('should render the main sections', () => {
    render(<App />);
    expect(screen.getByText('SPA Dan Med')).toBeInTheDocument();
    expect(screen.getByText('Triagem de Sintomas')).toBeInTheDocument();
    expect(screen.getByText('Consultas')).toBeInTheDocument();
    expect(screen.getByText('Exames e Check-up')).toBeInTheDocument();
  });

  it('should perform symptom triage', () => {
    render(<App />);
    const chestPainCheckbox = screen.getByLabelText(/Dor no peito/i);
    fireEvent.click(chestPainCheckbox);
    
    const triageButton = screen.getByText('Avaliar Sintomas');
    fireEvent.click(triageButton);

    const triageResult = screen.getByTestId('triage-result');
    expect(triageResult).toHaveTextContent('vermelho');
    expect(triageResult).toHaveTextContent('cardiologia');
  });

  it('should calculate exam bundle with coupon and display fasting hours', () => {
    render(<App />);
    
    const checkupButton = screen.getByText('Calcular Check-up');
    
    // Assert error when nothing is selected
    fireEvent.click(checkupButton);
    expect(screen.getByText('Selecione pelo menos um exame')).toBeInTheDocument();

    // Select three exams to get the 10% discount
    const lipidicoCheckbox = screen.getByLabelText(/Perfil Lipídico/i);
    const hemogramaCheckbox = screen.getByLabelText(/Hemograma/i);
    const glicemiaCheckbox = screen.getByLabelText(/Glicemia/i);
    
    fireEvent.click(lipidicoCheckbox);
    fireEvent.click(hemogramaCheckbox);
    fireEvent.click(glicemiaCheckbox);
    
    // Total original price: 100 + 50 + 30 = 180
    // 3 distinct exams: 10% off -> 180 - 18 = 162
    
    const couponInput = screen.getByPlaceholderText('Ex: DANMED15');
    fireEvent.change(couponInput, { target: { value: 'DANMED15' } });
    
    // 15% off sequentially -> 162 * 0.85 = 137.7
    
    fireEvent.click(checkupButton);
    
    const examResult = screen.getByTestId('exam-result');
    expect(examResult).toHaveTextContent('R$ 137.70');
    expect(examResult).toHaveTextContent('12h'); // 12 hours from lipidico
  });

  it('should quote and schedule appointment', () => {
    render(<App />);
    
    const doctorSelect = screen.getByLabelText(/Médico:/i);
    // Dr. João Silva is active and cardiologia, id '1'
    fireEvent.change(doctorSelect, { target: { value: '1' } });
    
    const modeSelect = screen.getByLabelText(/Modalidade:/i);
    fireEvent.change(modeSelect, { target: { value: 'telemedicina' } });
    // basePrice 100 -> telemedicina 0.85 -> 85
    
    const planSelect = screen.getByLabelText(/Plano de Saúde:/i);
    fireEvent.change(planSelect, { target: { value: 'convenio-basico' } });
    // convenio-basico 0.30 -> 85 * 0.3 = 25.5
    
    const appointmentButton = screen.getByText('Cotar e Agendar');
    fireEvent.click(appointmentButton);
    
    const appointmentResult = screen.getByTestId('appointment-result');
    expect(appointmentResult).toHaveTextContent('MED-');
    expect(appointmentResult).toHaveTextContent('Dr. João Silva');
    expect(appointmentResult).toHaveTextContent('R$ 25.50');
  });

  it('should handle appointment UI edge cases properly', () => {
    render(<App />);

    const appointmentButton = screen.getByText('Cotar e Agendar');
    expect(appointmentButton).toBeDisabled(); // Initially disabled as no doctor is selected

    const specialtySelect = screen.getByLabelText(/Especialidade:/i);
    fireEvent.change(specialtySelect, { target: { value: 'ortopedia' } });

    const doctorSelect = screen.getByLabelText(/Médico:/i);
    
    // Check that Dr. Pedro Santos is inactive and disabled
    const pedroSantosOption = screen.getByText(/Dr. Pedro Santos/i) as HTMLOptionElement;
    expect(pedroSantosOption.disabled).toBe(true);

    // Button should still be disabled as no valid doctor can be selected yet
    expect(appointmentButton).toBeDisabled();
    
    // Select valid doctor manually and verify resetting specialty removes doctorId
    fireEvent.change(specialtySelect, { target: { value: 'cardiologia' } });
    fireEvent.change(doctorSelect, { target: { value: '1' } });
    expect(appointmentButton).not.toBeDisabled();
    
    fireEvent.change(specialtySelect, { target: { value: 'dermatologia' } });
    expect(appointmentButton).toBeDisabled();
  });
});
