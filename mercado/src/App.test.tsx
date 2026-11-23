import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render the heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Dan Market/i })).toBeInTheDocument();
  });

  it('should filter by aisle', () => {
    render(<App />);
    expect(screen.getByText('Apples')).toBeInTheDocument();
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();

    const select = screen.getByLabelText(/Filtrar por corredor/i);
    fireEvent.change(select, { target: { value: 'PRODUCE' } });

    expect(screen.getByText('Apples')).toBeInTheDocument();
    expect(screen.queryByText('Milk')).not.toBeInTheDocument();
    expect(screen.queryByText('Bread')).not.toBeInTheDocument();
  });

  it('should add to cart and apply wholesale rules', () => {
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar ao Carrinho');
    
    // Apples button is index 0
    fireEvent.click(addButtons[0]);
    
    expect(screen.getByText('1x Apples')).toBeInTheDocument();
    expect(screen.getByText('Total a Pagar (Sem Frete): R$ 2.99')).toBeInTheDocument();
    
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton); // 2
    fireEvent.click(plusButton); // 3
    fireEvent.click(plusButton); // 4
    fireEvent.click(plusButton); // 5 (should trigger wholesale price: 5 * 2.50 = 12.50)

    expect(screen.getByText('5x Apples')).toBeInTheDocument();
    expect(screen.getByText('Total a Pagar (Sem Frete): R$ 12.50')).toBeInTheDocument();
  });
  
  it('should checkout and quote correctly', () => {
    // We mock Math.random so protocol matches
    const originalMathRandom = Math.random;
    Math.random = () => 0; // Protocol will be MKT-1000

    render(<App />);
    
    // Add milk
    const addButtons = screen.getAllByText('Adicionar ao Carrinho');
    fireEvent.click(addButtons[1]); // Milk
    
    // Change to Drive-Thru
    const deliveryMethodSelect = screen.getByLabelText(/Modo de Entrega/i);
    fireEvent.change(deliveryMethodSelect, { target: { value: 'DRIVE_THRU' } });
    
    // Set coupon
    const couponInput = screen.getByLabelText(/Cupom/i);
    fireEvent.change(couponInput, { target: { value: 'DANMKT10' } });
    
    // Click Checkout
    const checkoutBtn = screen.getByText('Finalizar Pedido');
    fireEvent.click(checkoutBtn);
    
    // Milk: 3.49. 10% discount = 0.35. Subtotal = 3.14
    expect(screen.getByText(/Resumo do Pedido #MKT-1000/i)).toBeInTheDocument();
    
    // Restore Math.random
    Math.random = originalMathRandom;
  });
});
