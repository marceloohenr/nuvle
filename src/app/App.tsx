import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Cart, Checkout } from '../features/cart';
import { ProductModal, SearchModal, type Product } from '../features/catalog';
import { Footer, Header } from '../features/layout';
import { AppProviders } from '../shared/providers';
import {
  AccountPage,
  CartPage,
  CheckoutPage,
  HomePage,
  LoginPage,
  OrdersPage,
  ProductDetailsPage,
  ProductsPage,
} from './pages';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleBackToCart = () => {
    setIsCheckoutOpen(false);
    setIsCartOpen(true);
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
              <Route path="/conta" element={<AccountPage />} />
              <Route path="/pedidos" element={<OrdersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />

          <Cart
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onCheckout={handleCheckout}
          />

          <Checkout
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onBack={handleBackToCart}
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
