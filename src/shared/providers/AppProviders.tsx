import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from '../../features/auth';
import { CartProvider } from '../../features/cart/context/CartContext';
import { CatalogProvider } from '../../features/catalog';
import { FavoritesProvider } from '../../features/favorites';
import { StoreSettingsProvider } from '../../features/settings';
import { ThemeProvider } from '../../features/theme/context/ThemeContext';
import { ToastProvider } from './ToastProvider';

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
      <ToastProvider>
        <AuthProvider>
          <StoreSettingsProvider>
            <CatalogProvider>
              <FavoritesProvider>
                <CartProviderGate>{children}</CartProviderGate>
              </FavoritesProvider>
            </CatalogProvider>
          </StoreSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
