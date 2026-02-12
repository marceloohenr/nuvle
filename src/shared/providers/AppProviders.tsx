import { ReactNode } from 'react';
import { CartProvider } from '../../features/cart/context/CartContext';
import { ThemeProvider } from '../../features/theme/context/ThemeContext';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ThemeProvider>
      <CartProvider>{children}</CartProvider>
    </ThemeProvider>
  );
};
