import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  setItemQuantity: (productId: number, qty: number) => void;
  clearCart: () => void;
  paymentMode: 'CASH' | 'CARD' | 'UPI';
  setPaymentMode: (mode: 'CASH' | 'CARD' | 'UPI') => void;
  discountAmount: string;
  setDiscountAmount: (val: string) => void;
  taxAmount: string;
  setTaxAmount: (val: string) => void;
  subtotal: number;
  totalAmount: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [discountAmount, setDiscountAmount] = useState<string>('0.00');
  const [taxAmount, setTaxAmount] = useState<string>('0.00');

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const setItemQuantity = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountAmount('0.00');
    setTaxAmount('0.00');
    setPaymentMode('CASH');
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.product.selling_price) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    const disc = parseFloat(discountAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const total = subtotal - disc + tax;
    return total >= 0 ? total : 0;
  }, [subtotal, discountAmount, taxAmount]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        setItemQuantity,
        clearCart,
        paymentMode,
        setPaymentMode,
        discountAmount,
        setDiscountAmount,
        taxAmount,
        setTaxAmount,
        subtotal,
        totalAmount,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
