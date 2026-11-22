import { useState, useRef, useEffect } from 'react';
import './App.css';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
};

const MENU: MenuItem[] = [
  { id: '1', name: 'Hambúrguer Clássico', description: 'Pão, blend de carnes 180g, queijo cheddar e salada.', price: 28.5, category: 'Lanches' },
  { id: '2', name: 'Batata Frita', description: 'Porção de batatas fritas crocantes.', price: 15.0, category: 'Acompanhamentos' },
  { id: '3', name: 'Pizza Marguerita', description: 'Massa fina, molho de tomate, queijo mozzarella e manjericão.', price: 45.0, category: 'Pratos Principais' },
  { id: '4', name: 'Refrigerante Cola', description: 'Lata 350ml.', price: 7.0, category: 'Bebidas' },
  { id: '5', name: 'Suco de Laranja', description: 'Copo 400ml de suco natural.', price: 9.0, category: 'Bebidas' },
  { id: '6', name: 'Pudim', description: 'Fatia de pudim de leite condensado.', price: 12.0, category: 'Sobremesas' },
];

type CartItem = MenuItem & { quantity: number };

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const checkoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (checkoutTimer.current) {
        clearTimeout(checkoutTimer.current);
      }
    };
  }, []);

  const categories = Array.from(new Set(MENU.map((item) => item.category)));

  const addToCart = (item: MenuItem) => {
    if (isCheckout) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    if (isCheckout) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearCart = () => setCart([]);

  const totalCart = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0 || isCheckout) return;
    setIsCheckout(true);
    checkoutTimer.current = setTimeout(() => {
      alert('Pedido realizado com sucesso!');
      clearCart();
      setIsCheckout(false);
      checkoutTimer.current = null;
    }, 1500);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Restaurante Sabor & Arte</h1>
      </header>
      
      <main className="main-content">
        <div className="menu-section">
          <h2>Cardápio</h2>
          {categories.map((category) => (
            <div key={category} className="category-block">
              <h3>{category}</h3>
              <div className="menu-grid">
                {MENU.filter((item) => item.category === category).map((item) => (
                  <div key={item.id} className="menu-card">
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <div className="menu-card-footer">
                      <span className="price">R$ {item.price.toFixed(2)}</span>
                      <button onClick={() => addToCart(item)} disabled={isCheckout}>Adicionar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="cart-section">
          <h2>Carrinho</h2>
          {cart.length === 0 ? (
            <p>Seu carrinho está vazio.</p>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">
                      {item.quantity}x R$ {item.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => removeFromCart(item.id)} disabled={isCheckout}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)} disabled={isCheckout}>+</button>
                  </div>
                </div>
              ))}
              <div className="cart-total">
                <strong>Total:</strong>
                <strong>R$ {totalCart.toFixed(2)}</strong>
              </div>
              <button 
                className="checkout-button" 
                onClick={handleCheckout} 
                disabled={isCheckout}
              >
                {isCheckout ? 'Processando...' : 'Finalizar Pedido'}
              </button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
