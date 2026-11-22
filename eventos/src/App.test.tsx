import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App - Dan Tickets SPA', () => {
  it('renders the event list initially', () => {
    render(<App />);
    expect(screen.getByText('Dan Tickets')).toBeInTheDocument();
    expect(screen.getByText('Shows')).toBeInTheDocument();
  });

  it('filters events by city', () => {
    render(<App />);
    const filterInput = screen.getByPlaceholderText('Filtrar por cidade');
    const filterButton = screen.getByText('Buscar');

    fireEvent.change(filterInput, { target: { value: 'rio de janeiro' } });
    fireEvent.click(filterButton);

    expect(screen.getByText('Rock in Rio')).toBeInTheDocument();
    expect(screen.queryByText('Lollapalooza')).not.toBeInTheDocument();
  });

  it('navigates to order form and validates student ticket', () => {
    render(<App />);
    const buyButtons = screen.getAllByText('Comprar Ingresso');
    fireEvent.click(buyButtons[0]);

    expect(screen.getByText(/Comprar Ingresso -/)).toBeInTheDocument();

    const benefitSelect = screen.getByLabelText('Benefício:');
    fireEvent.change(benefitSelect, { target: { value: 'estudante' } });

    const emitButton = screen.getByText('Emitir Ingresso');
    fireEvent.click(emitButton);

    // Should show error because student card is missing
    expect(screen.getByText('Valid student card number required for estudante benefit')).toBeInTheDocument();

    const studentCardInput = screen.getByLabelText('Carteirinha de Estudante:');
    fireEvent.change(studentCardInput, { target: { value: '12345' } });

    fireEvent.click(emitButton);

    // Should issue ticket successfully
    expect(screen.getByText('Ingresso Emitido com Sucesso!')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-code').textContent).toMatch(/^TKT-/);
  });
  
  it('applies coupon and reflects in pricing summary', () => {
    render(<App />);
    const buyButtons = screen.getAllByText('Comprar Ingresso');
    fireEvent.click(buyButtons[0]);

    const couponInput = screen.getByLabelText('Cupom de Desconto:');
    fireEvent.change(couponInput, { target: { value: 'DANSHOW10' } });

    // For Rock in Rio (id 1): price = 300, sector = pista (1.0), batch = 1 (1.0), benefit = inteira.
    // Subtotal: 300. Discount 10% = 30. Fee (digital delivery, 10% of 270) = 27. Total: 297.
    expect(screen.getByText('Total: R$ 297.00')).toBeInTheDocument();
  });
});
