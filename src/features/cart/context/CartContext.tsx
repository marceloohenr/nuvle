import React, { createContext, useContext, useReducer, ReactNode } from 'react';
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

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const { product, size } = action.payload;
      const existingItem = state.items.find(
        item => item.id === product.id && item.size === size
      );

      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return { items: updatedItems, total };
      }

      const newItem: CartItem = { ...product, quantity: 1, size };
      const items = [...state.items, newItem];
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { items, total };
    }

    case 'REMOVE_FROM_CART': {
      const items = state.items.filter(item => 
        `${item.id}-${item.size}` !== action.payload
      );
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { items, total };
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      const items = state.items.map(item =>
        `${item.id}-${item.size}` === id
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      ).filter(item => item.quantity > 0);
      
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { items, total };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0 };

    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
