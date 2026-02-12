import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import type { Product } from '../types/product';
import ProductCard from './ProductCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductClick: (product: Product) => void;
}

const SearchModal = ({ isOpen, onClose, onProductClick }: SearchModalProps) => {
  const { products } = useCatalog();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleProductSelect = (product: Product) => {
    onProductClick(product);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-16">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pesquisar produtos</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-6">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Digite o nome do produto..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {searchTerm.trim() === '' ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Digite algo para pesquisar produtos
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum produto encontrado para "{searchTerm}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.slice(0, 6).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onProductClick={handleProductSelect}
                    />
                  ))}
                </div>
              )}

              {filteredProducts.length > 6 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando 6 de {filteredProducts.length} resultados
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
