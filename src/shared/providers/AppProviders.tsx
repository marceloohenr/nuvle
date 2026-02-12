import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from '../../features/auth';
import { CartProvider } from '../../features/cart/context/CartContext';
import { CatalogProvider } from '../../features/catalog';
import { ThemeProvider } from '../../features/theme/context/ThemeContext';

interface AppProvidersProps {
  children: ReactNode;
}

const CartProviderGate = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();

  return <CartProvider key={currentUser?.id ?? 'guest'}>{children}</CartProvider>;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CatalogProvider>
          <CartProviderGate>{children}</CartProviderGate>
        </CatalogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
