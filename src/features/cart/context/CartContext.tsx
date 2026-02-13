import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { Product } from '../../catalog/types/product';
import { CartItem } from '../types/cart';

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: { product: Product; size?: string } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

const CART_STORAGE_KEY = 'nuvle-cart-v1';
const INITIAL_STATE: CartState = { items: [], total: 0 };

const calculateTotal = (items: CartItem[]) => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

const getAvailableStockForSelection = (product: Product, size?: string) => {
  if (size && product.stockBySize) {
    const normalizedSize = size.trim().toUpperCase();
    return Math.max(0, Number(product.stockBySize[normalizedSize] ?? 0));
  }

  return Math.max(0, Number(product.stock ?? 0));
};

const normalizeStock = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

const normalizeStoredItems = (value: unknown): CartItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is CartItem => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      ...item,
      quantity: Math.max(1, Number(item.quantity) || 1),
      stock: normalizeStock(item.stock),
    }));
};

const getInitialState = (): CartState => {
  if (typeof window === 'undefined') return INITIAL_STATE;

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return INITIAL_STATE;

    const parsed = JSON.parse(raw) as { items?: unknown };
    const items = normalizeStoredItems(parsed.items);
    return { items, total: calculateTotal(items) };
  } catch {
    return INITIAL_STATE;
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const { product, size } = action.payload;
      const availableStock = getAvailableStockForSelection(product, size);
      if (availableStock <= 0) return state;

      const existingItem = state.items.find(
        (item) => item.id === product.id && item.size === size
      );

      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          return state;
        }

        const updatedItems = state.items.map((item) =>
          item.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        return { items: updatedItems, total: calculateTotal(updatedItems) };
      }

      const nextItems: CartItem[] = [
        ...state.items,
        {
          ...product,
          quantity: 1,
          size,
          stock: availableStock,
        },
      ];
      return { items: nextItems, total: calculateTotal(nextItems) };
    }

    case 'REMOVE_FROM_CART': {
      const nextItems = state.items.filter(
        (item) => `${item.id}-${item.size}` !== action.payload
      );
      return { items: nextItems, total: calculateTotal(nextItems) };
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      const nextItems = state.items
        .map((item) => {
          if (`${item.id}-${item.size}` !== id) return item;

          const maxQuantity = Math.max(0, item.stock);
          return {
            ...item,
            quantity: Math.max(0, Math.min(quantity, maxQuantity)),
          };
        })
        .filter((item) => item.quantity > 0);

      return { items: nextItems, total: calculateTotal(nextItems) };
    }

    case 'CLEAR_CART':
      return INITIAL_STATE;

    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_STATE, getInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: state.items }));
    } catch {
      // Ignore quota or permission errors to avoid breaking checkout flow.
    }
  }, [state.items]);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
