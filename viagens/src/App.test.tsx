import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('should render destinations and filter them', () => {
    render(<App />);
    expect(screen.getByText(/Rio de Janeiro/i)).toBeDefined();
    expect(screen.getByText(/Paris/i)).toBeDefined();

    const filter = screen.getByLabelText(/Filtro de Destino/i);
    fireEvent.change(filter, { target: { value: 'nacional' } });
    
    expect(screen.getByText(/Rio de Janeiro/i)).toBeDefined();
    expect(screen.queryByText(/Paris/i)).toBeNull();
  });

  it('should select destination and render package builder and checkout', () => {
    render(<App />);
    const dest = screen.getByTestId('dest-1');
    fireEvent.click(dest);

    expect(screen.getByText(/Montador de Pacotes/i)).toBeDefined();
    expect(screen.getByText(/Finalizar Viagem/i)).toBeDefined();
  });

  it('should calculate package quote correctly', () => {
    render(<App />);
    const dest = screen.getByTestId('dest-1'); // Rio (1500)
    fireEvent.click(dest);

    const travelers = screen.getByTestId('input-travelers');
    fireEvent.change(travelers, { target: { value: '2' } }); // 2 travelers

    const cabin = screen.getByTestId('select-cabin');
    fireEvent.change(cabin, { target: { value: 'executiva' } }); // 2.2 multiplier = 3300 * 2 = 6600

    const excursion = screen.getByTestId('exc-e1'); // Cristo Redentor 150
    fireEvent.click(excursion); // 150 * 2 = 300
    
    // total = 6600 + 300 = 6900
    const quoteTotal = screen.getByTestId('quote-total');
    expect(quoteTotal.textContent).toContain('6900');
  });

  it('should finalize checkout with miles and coupon', () => {
    render(<App />);
    const dest = screen.getByTestId('dest-1'); // Rio (1500 base price)
    fireEvent.click(dest);

    const miles = screen.getByTestId('input-miles');
    fireEvent.change(miles, { target: { value: '20000' } }); // 20k miles = 500 discount
    
    const coupon = screen.getByTestId('input-coupon');
    fireEvent.change(coupon, { target: { value: 'DANTRIP10' } }); // 10% on (1500 - 500) = 10% of 1000 = 100

    const btn = screen.getByTestId('btn-checkout');
    fireEvent.click(btn);

    const finalValue = screen.getByTestId('checkout-final');
    expect(finalValue.textContent).toContain('900'); // 1000 - 100 = 900
    
    const locator = screen.getByTestId('locator');
    expect(locator.textContent).toMatch(/TRP-[A-Z0-9]{4}/);
  });

  it('should enforce travel insurance for international destinations', () => {
    render(<App />);
    const filter = screen.getByLabelText(/Filtro de Destino/i);
    fireEvent.change(filter, { target: { value: 'internacional' } });
    
    const dest = screen.getByTestId('dest-2'); // Paris
    fireEvent.click(dest);

    const btn = screen.getByTestId('btn-checkout');
    fireEvent.click(btn); // no insurance checked

    const error = screen.getByTestId('checkout-error');
    expect(error.textContent).toMatch(/Seguro viagem é obrigatório/i);
    
    const insurance = screen.getByTestId('check-insurance');
    fireEvent.click(insurance);
    
    fireEvent.click(btn);
    expect(screen.queryByTestId('checkout-error')).toBeNull();
    expect(screen.getByTestId('locator')).toBeDefined();
  });
});

