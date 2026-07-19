import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type { CartItem, Product } from '../types';

const CART_INACTIVITY_MS = 10 * 60 * 1000; // 10 minutos

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, notes?: string) => void;
  removeItem: (productId: number, notes?: string) => void;
  updateQuantity: (productId: number, quantity: number, notes?: string) => void;
  updateDiscount: (productId: number, discount: number, notes?: string) => void;
  updateNotes: (productId: number, oldNotes: string | undefined, newNotes: string | undefined) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  totalDiscount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const itemKey = (productId: number, notes?: string) => `${productId}::${notes || ''}`;

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (items.length > 0) {
      inactivityTimer.current = setTimeout(() => setItems([]), CART_INACTIVITY_MS);
    }
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [items]);

  const addItem = (product: Product, quantity: number = 1, notes?: string) => {
    setItems((prev) => {
      const existing = prev.find((item) => itemKey(item.product.id, item.notes) === itemKey(product.id, notes));
      if (existing) {
        return prev.map((item) =>
          itemKey(item.product.id, item.notes) === itemKey(product.id, notes)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, discount: 0, notes }];
    });
  };

  const removeItem = (productId: number, notes?: string) => {
    setItems((prev) => prev.filter((item) => itemKey(item.product.id, item.notes) !== itemKey(productId, notes)));
  };

  const updateQuantity = (productId: number, quantity: number, notes?: string) => {
    if (quantity <= 0) {
      removeItem(productId, notes);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        itemKey(item.product.id, item.notes) === itemKey(productId, notes) ? { ...item, quantity } : item
      )
    );
  };

  const updateDiscount = (productId: number, discount: number, notes?: string) => {
    setItems((prev) =>
      prev.map((item) =>
        itemKey(item.product.id, item.notes) === itemKey(productId, notes) ? { ...item, discount } : item
      )
    );
  };

  const updateNotes = (productId: number, oldNotes: string | undefined, newNotes: string | undefined) => {
    setItems((prev) =>
      prev.map((item) =>
        itemKey(item.product.id, item.notes) === itemKey(productId, oldNotes)
          ? { ...item, notes: newNotes }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.sale_price * item.quantity,
    0
  );

  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);

  const total = subtotal - totalDiscount;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateDiscount,
        updateNotes,
        clearCart,
        total,
        subtotal,
        totalDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
