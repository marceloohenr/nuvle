import React, { useState } from 'react';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import ProductModal from './components/ProductModal';
import SearchModal from './components/SearchModal';
import { Product } from './types/product';
import { products } from './data/products';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'basicas' | 'estampadas' | 'oversized'>('all');

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

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(product => product.category === activeCategory);

  return (
    <ThemeProvider>
      <CartProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Header 
            onMenuToggle={() => {}} 
            onCartToggle={() => setIsCartOpen(true)}
            onSearchToggle={() => setIsSearchOpen(true)}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section */}
            <section id="home" className="mb-12">
              <div className="text-center mb-8">
                <img 
                  src="https://i.postimg.cc/T3JgbyjR/VENHA-CONFERIR.png" 
                  alt="Venha Conferir" 
                  className="mx-auto mb-6 max-w-full h-auto rounded-lg shadow-lg"
                />
                <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                  #USENUVLE
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                ⚡Conforto e estilo na pegada de um raio⚡
                </p>
              </div>
            </section>

            {/* Category Filter */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-wrap">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-6 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveCategory('basicas')}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    activeCategory === 'basicas'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  Básicas
                </button>
                <button
                  onClick={() => setActiveCategory('oversized')}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    activeCategory === 'oversized'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  Oversized
                </button>
                <button
                  onClick={() => setActiveCategory('estampadas')}
                  className={`px-6 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                    activeCategory === 'estampadas'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  Estampadas
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductClick={handleProductClick}
                />
              ))}
            </section>

            {/* Contact Section */}
            <section id="contato" className="mt-16 text-center">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                Entre em Contato
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Siga-nos nas redes sociais e fique por dentro das novidades
              </p>
              <a 
                href="https://linktr.ee/nuvle" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Ver Links de Contato
              </a>
            </section>
          </main>

          {/* Modals */}
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
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;