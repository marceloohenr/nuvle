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
} from './pages';

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
};

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300">
          <Header
            onCartToggle={() => setIsCartOpen(true)}
            onSearchToggle={() => setIsSearchOpen(true)}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
