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

  it('navigates back to event list on cancel', () => {
    render(<App />);
    const buyButtons = screen.getAllByText('Comprar Ingresso');
    fireEvent.click(buyButtons[0]);

    expect(screen.getByText(/Comprar Ingresso -/)).toBeInTheDocument();

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(screen.getByText('Shows')).toBeInTheDocument();
    expect(screen.queryByText(/Comprar Ingresso -/)).not.toBeInTheDocument();
  });

  it('resets to event list when clicking Comprar Outro', () => {
    render(<App />);
    const buyButtons = screen.getAllByText('Comprar Ingresso');
    fireEvent.click(buyButtons[0]);

    const emitButton = screen.getByText('Emitir Ingresso');
    fireEvent.click(emitButton);

    expect(screen.getByText('Ingresso Emitido com Sucesso!')).toBeInTheDocument();

    const buyOtherButton = screen.getByText('Comprar Outro');
    fireEvent.click(buyOtherButton);

    expect(screen.getByText('Shows')).toBeInTheDocument();
    expect(screen.queryByText('Ingresso Emitido com Sucesso!')).not.toBeInTheDocument();
  });

  it('requires pledge for social benefit', () => {
    render(<App />);
    const buyButtons = screen.getAllByText('Comprar Ingresso');
    fireEvent.click(buyButtons[0]);

    const benefitSelect = screen.getByLabelText('Benefício:');
    fireEvent.change(benefitSelect, { target: { value: 'social' } });

    const emitButton = screen.getByText('Emitir Ingresso');
    fireEvent.click(emitButton);

    expect(screen.getByText('Food donation pledge required for social benefit')).toBeInTheDocument();

    const pledgeCheckbox = screen.getByLabelText(/Comprometo-me a doar/);
    fireEvent.click(pledgeCheckbox);

    fireEvent.click(emitButton);

    expect(screen.getByText('Ingresso Emitido com Sucesso!')).toBeInTheDocument();
  });

  it('handles empty city filter gracefully', () => {
    render(<App />);
    const filterInput = screen.getByPlaceholderText('Filtrar por cidade');
    const filterButton = screen.getByText('Buscar');

    fireEvent.change(filterInput, { target: { value: 'cidade inexistente' } });
    fireEvent.click(filterButton);

    expect(screen.queryByText('Comprar Ingresso')).not.toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: '   ' } });
    fireEvent.click(filterButton);

    expect(screen.getAllByText('Comprar Ingresso').length).toBeGreaterThan(0);
  });

  it('validates quantity boundaries', () => {
    render(<App />);
    const buyButtons = screen.getAllByText('Comprar Ingresso');
    fireEvent.click(buyButtons[0]);

    const quantityInput = screen.getByLabelText('Quantidade:');
    
    // Test empty
    fireEvent.change(quantityInput, { target: { value: '' } });
    expect(screen.getByText('Quantidade inválida (deve ser entre 1 e 4).')).toBeInTheDocument();

    // Test 0
    fireEvent.change(quantityInput, { target: { value: '0' } });
    expect(screen.getByText('Quantidade inválida (deve ser entre 1 e 4).')).toBeInTheDocument();

    // Test 5
    fireEvent.change(quantityInput, { target: { value: '5' } });
    expect(screen.getByText('Quantidade inválida (deve ser entre 1 e 4).')).toBeInTheDocument();
    
    // Prevent submit on error
    const emitButton = screen.getByText('Emitir Ingresso');
    fireEvent.click(emitButton);
    expect(screen.queryByText('Ingresso Emitido com Sucesso!')).not.toBeInTheDocument();

    // Fix error to ensure submission works afterwards
    fireEvent.change(quantityInput, { target: { value: '2' } });
    expect(screen.queryByText('Quantidade inválida (deve ser entre 1 e 4).')).not.toBeInTheDocument();
    
    fireEvent.click(emitButton);
    expect(screen.getByText('Ingresso Emitido com Sucesso!')).toBeInTheDocument();
  });
});
