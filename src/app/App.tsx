import { type ReactElement, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '../features/auth';
import { Cart } from '../features/cart';
import { ProductModal, SearchModal, type Product } from '../features/catalog';
import { Footer, Header } from '../features/layout';
import { AppProviders } from '../shared/providers';
import {
  AccountPage,
  AdminPage,
  CartPage,
  CheckoutPage,
  HomePage,
  LoginPage,
  OrderDetailsPage,
  OrdersPage,
  ProductDetailsPage,
  ProductsPage,
  ResetPasswordPage,
} from './pages';

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Carregando sessao...
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
};

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Verificando permissoes da conta...
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/conta" replace />;
  }

  return children;
};

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  return (
    <AppProviders>
      <BrowserRouter>
        <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-slate-100">
          <Header
            onCartToggle={() => setIsCartOpen(true)}
            onSearchToggle={() => setIsSearchOpen(true)}
          />

          <main className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-10">
            <Routes>
              <Route path="/" element={<HomePage onProductClick={handleProductClick} />} />
              <Route
                path="/produtos"
                element={<ProductsPage onProductClick={handleProductClick} />}
              />
              <Route path="/carrinho" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/produto/:productId" element={<ProductDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
              <Route
                path="/conta"
                element={(
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/pedidos"
                element={(
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/pedidos/:orderId"
                element={(
                  <ProtectedRoute>
                    <OrderDetailsPage />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/admin"
                element={(
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                )}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />

          <Cart
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          />

          <ProductModal
            product={selectedProduct}
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
          />

          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onProductClick={handleProductClick}
          />
        </div>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
