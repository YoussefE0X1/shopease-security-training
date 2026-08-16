import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import type { Cart, CartItem } from '../types';

interface CartContextType {
  cart: Cart | null; loading: boolean
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number, variant?: CartItem['variant'], price?: number, discountPercent?: number) => Promise<void>
  updateQty: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => void
  itemCount: number
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/cart');
      setCart(data.data);
    } catch { setCart({ items: [], total: 0, _id: '' }); }
    finally { setLoading(false); }
  }, []);

  // The discounted unit price and the discountPercent the UI displayed are sent
  // along — a legitimate request carries both business values (LOG-01 relies on
  // the backend trusting them instead of re-deriving from the catalog).
  const addItem = async (productId: string, quantity = 1, variant?: CartItem['variant'], price?: number, discountPercent?: number) => {
    const { data } = await api.post('/cart/items', { product: productId, quantity, variant, price, discountPercent });
    setCart(data.data);
  };

  const updateQty = async (itemId: string, quantity: number) => {
    const { data } = await api.patch(`/cart/items/${itemId}`, { quantity });
    setCart(data.data);
  };

  const removeItem = async (itemId: string) => {
    const { data } = await api.delete(`/cart/items/${itemId}`);
    setCart(data.data);
  };

  const clearCart = () => setCart({ items: [], total: 0, _id: '' });

  const itemCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, fetchCart, addItem, updateQty, removeItem, clearCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
