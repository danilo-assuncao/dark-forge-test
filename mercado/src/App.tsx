import { useState, useMemo } from 'react';
import { listGroceries, filterByAisle, getGroceryById } from './data/groceries';
import { quoteGroceryDelivery, DeliveryMethod, DeliveryQuote } from './domain/delivery';
import { calculateCartPricing, WholesaleRule } from './domain/wholesale';
import { AisleCategory, CartEntry, SubstitutionRule, GroceryItem } from './types';
import './App.css';

const WHOLESALE_RULES: WholesaleRule[] = [
  { itemId: '1', minWholesaleQty: 5, wholesalePriceBrl: 2.50 }, // Apples
  { itemId: '2', minWholesaleQty: 3, wholesalePriceBrl: 3.00 }, // Milk
  { itemId: '3', minWholesaleQty: 4, wholesalePriceBrl: 2.00 }, // Bread
];

export default function App() {
  const [aisleFilter, setAisleFilter] = useState<AisleCategory | 'ALL'>('ALL');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('HOME_DELIVERY');
  const [couponCode, setCouponCode] = useState('');
  const [isClubeMember, setIsClubeMember] = useState(false);
  const [quote, setQuote] = useState<(DeliveryQuote & { pricingTotal: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayedGroceries = useMemo(() => {
    return aisleFilter === 'ALL' ? listGroceries() : filterByAisle(aisleFilter);
  }, [aisleFilter]);

  const addToCart = (itemId: string) => {
    setQuote(null);
    setCart(prev => {
      const existing = prev.find(entry => entry.itemId === itemId);
      if (existing) {
        return prev.map(entry => entry === existing ? { ...entry, quantity: entry.quantity + 1 } : entry);
      }
      return [...prev, { itemId, quantity: 1, substitution: 'SAME_BRAND' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setQuote(null);
    setCart(prev => prev.map(entry => {
      if (entry.itemId === itemId) {
        return { ...entry, quantity: Math.max(0, entry.quantity + delta) };
      }
      return entry;
    }).filter(entry => entry.quantity > 0));
  };

  const updateSubstitution = (itemId: string, substitution: SubstitutionRule) => {
    setQuote(null);
    setCart(prev => prev.map(entry => {
      if (entry.itemId === itemId) {
        return { ...entry, substitution };
      }
      return entry;
    }));
  };

  const pricing = useMemo(() => {
    return calculateCartPricing({
      cart,
      wholesaleRules: WHOLESALE_RULES,
      isClubeMember,
      couponCode
    });
  }, [cart, isClubeMember, couponCode]);

  const handleCheckout = () => {
    try {
      setError(null);
      const result = quoteGroceryDelivery({ entries: cart, method: deliveryMethod });
      setQuote({ ...result, pricingTotal: pricing.total });
      setCart([]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Dan Market</h1>
      </header>
      
      <main className="main-content">
        <section className="products-section">
          <h2>Produtos</h2>
          <div className="filters">
            <label htmlFor="aisle-filter">Filtrar por corredor: </label>
            <select
              id="aisle-filter"
              value={aisleFilter}
              onChange={(e) => setAisleFilter(e.target.value as AisleCategory | 'ALL')}
            >
              <option value="ALL">Todos</option>
              <option value="PRODUCE">Hortifruti</option>
              <option value="DAIRY">Laticínios</option>
              <option value="BAKERY">Padaria</option>
              <option value="MEAT">Carnes</option>
              <option value="FROZEN">Congelados</option>
              <option value="PANTRY">Despensa</option>
            </select>
          </div>

          <div className="product-grid">
            {displayedGroceries.map((item: GroceryItem) => {
              const rule = WHOLESALE_RULES.find(r => r.itemId === item.id);
              const cartEntry = cart.find(c => c.itemId === item.id);
              const quantityInCart = cartEntry?.quantity || 0;

              return (
                <div key={item.id} className="product-card">
                  <h3>{item.name}</h3>
                  <p>Preço: R$ {item.price.toFixed(2)}</p>
                  {rule && (
                    <div className="wholesale-indicator">
                      Atacado: R$ {rule.wholesalePriceBrl.toFixed(2)} (min. {rule.minWholesaleQty} un)
                    </div>
                  )}
                  <p>Corredor: {item.aisle}</p>
                  <p>{item.inStock ? 'Em estoque' : 'Esgotado'}</p>
                  
                  {quantityInCart === 0 ? (
                    <button className="add-button" onClick={() => addToCart(item.id)} disabled={!item.inStock}>
                      Adicionar ao Carrinho
                    </button>
                  ) : (
                    <div className="quantity-controls">
                      <button className="quantity-button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{quantityInCart}</span>
                      <button className="quantity-button" onClick={() => updateQuantity(item.id, 1)} disabled={!item.inStock}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="cart-section">
          <h2>Carrinho</h2>
          {cart.length === 0 ? (
            <p>Seu carrinho está vazio.</p>
          ) : (
            <>
              <ul className="cart-list">
                {cart.map(entry => {
                  const item = getGroceryById(entry.itemId);
                  if (!item) return null;
                  return (
                    <li key={entry.itemId} className="cart-item">
                      <span>{entry.quantity}x {item.name}</span>
                      <label>
                        Substituição:
                        <select
                          value={entry.substitution}
                          onChange={(e) => updateSubstitution(entry.itemId, e.target.value as SubstitutionRule)}
                        >
                          <option value="SAME_BRAND">Mesma Marca</option>
                          <option value="ANY">Qualquer</option>
                          <option value="NONE">Nenhuma</option>
                        </select>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="cart-options">
                <label>
                  Modo de Entrega:
                  <select
                    value={deliveryMethod}
                    onChange={(e) => {
                      setDeliveryMethod(e.target.value as DeliveryMethod);
                      setQuote(null);
                    }}
                  >
                    <option value="HOME_DELIVERY">Entrega em Domicílio</option>
                    <option value="DRIVE_THRU">Drive-Thru (Retirada)</option>
                  </select>
                </label>
                
                <label>
                  <input
                    type="checkbox"
                    checked={isClubeMember}
                    onChange={(e) => setIsClubeMember(e.target.checked)}
                  />
                  Membro do Clube
                </label>
                
                <label>
                  Cupom:
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Ex: DANMKT10"
                  />
                </label>
              </div>

              <div className="pricing-summary">
                <p>Subtotal: R$ {pricing.subtotal.toFixed(2)}</p>
                {pricing.discount > 0 && <p className="discount">Desconto: -R$ {pricing.discount.toFixed(2)}</p>}
                <p>Total a Pagar (Sem Frete): R$ {pricing.total.toFixed(2)}</p>
                {pricing.cashback > 0 && <p className="cashback">Cashback: R$ {pricing.cashback.toFixed(2)}</p>}
              </div>

              <button className="checkout-button" onClick={handleCheckout}>
                Finalizar Pedido
              </button>
            </>
          )}

          {error && <div className="error-notice">{error}</div>}

          {quote && (
            <div className="quote-result">
              <h3>Resumo do Pedido #{quote.protocol}</h3>
              <p>Produtos: R$ {quote.pricingTotal.toFixed(2)}</p>
              <p>Frete: {quote.freight > 0 ? `R$ ${quote.freight.toFixed(2)}` : 'Grátis'}</p>
              {quote.requiresThermalBag && (
                <p className="thermal-bag-notice">Inclui embalagem térmica para itens congelados/laticínios.</p>
              )}
              <p><strong>Total: R$ {(quote.pricingTotal + quote.freight).toFixed(2)}</strong></p>
              <p className="success-msg">Pedido realizado com sucesso!</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
