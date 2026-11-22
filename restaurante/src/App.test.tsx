import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

describe('App', () => {
  it('should render the menu and an empty cart', () => {
    render(<App />);
    expect(screen.getByText('Restaurante Sabor & Arte')).toBeInTheDocument();
    expect(screen.getByText('Seu carrinho está vazio.')).toBeInTheDocument();
  });

  it('should add an item to the cart', () => {
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);

    // Check if the item is added to the cart
    const items = screen.getAllByText('Hambúrguer Clássico');
    expect(items.length).toBe(2);
    expect(screen.getByText('Total:')).toBeInTheDocument();
  });

  it('should increment quantity when adding the same item twice', () => {
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);

    // Quantity should be 2, checking via price calculation text 2x R$ 28.50
    expect(screen.getByText('2x R$ 28.50')).toBeInTheDocument();
  });

  it('should decrement quantity when removing an item with >1 quantity', () => {
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);

    const removeButton = screen.getByText('-');
    fireEvent.click(removeButton);

    expect(screen.getByText('1x R$ 28.50')).toBeInTheDocument();
  });

  it('should remove the item from the cart when removing at quantity 1', () => {
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);

    const removeButton = screen.getByText('-');
    fireEvent.click(removeButton);

    expect(screen.getByText('Seu carrinho está vazio.')).toBeInTheDocument();
  });

  it('should calculate the correct total', () => {
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    
    // Hamburger (28.5)
    fireEvent.click(addButtons[0]);
    // Batata frita (15.0)
    fireEvent.click(addButtons[1]);
    
    expect(screen.getByText('R$ 43.50')).toBeInTheDocument();
  });

  it('should handle checkout and clear the cart after timeout', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);

    const checkoutBtn = screen.getByText('Finalizar Pedido');
    fireEvent.click(checkoutBtn);

    expect(screen.getByText('Processando...')).toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    expect(window.alert).toHaveBeenCalledWith('Pedido realizado com sucesso!');
    expect(screen.getByText('Seu carrinho está vazio.')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should disable add/remove buttons during checkout', () => {
    vi.useFakeTimers();
    
    render(<App />);
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);

    const checkoutBtn = screen.getByText('Finalizar Pedido');
    fireEvent.click(checkoutBtn);

    // Try to add another item
    fireEvent.click(addButtons[1]);

    // Check that button is disabled
    expect(addButtons[1]).toBeDisabled();
    
    const cartAdd = screen.getByText('+');
    const cartRemove = screen.getByText('-');
    
    expect(cartAdd).toBeDisabled();
    expect(cartRemove).toBeDisabled();

    act(() => {
      vi.runAllTimers();
    });

    vi.useRealTimers();
  });
});
