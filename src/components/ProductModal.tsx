import React, { useState } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../contexts/CartContext';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, isOpen, onClose }) => {
  const { dispatch } = useCart();
  const [selectedSize, setSelectedSize] = useState('');

  if (!isOpen || !product) return null;

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (product.sizes && !selectedSize) {
      alert('Por favor, selecione um tamanho');
      return;
    }
    dispatch({ 
      type: 'ADD_TO_CART', 
      payload: { product, size: selectedSize } 
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 z-10"
          >
            <X size={20} />
          </button>

          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Product Image */}
            <div className="relative">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-80 object-cover rounded-lg"
              />
              {discount > 0 && (
                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {product.name}
              </h2>
              
              <div className="mb-4">
                {product.originalPrice && (
                  <span className="text-lg text-gray-500 dark:text-gray-400 line-through mr-2">
                    R$ {product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {product.price.toFixed(2)}
                </span>
              </div>

              {product.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {product.description}
                </p>
              )}

              {product.sizes && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecione o tamanho:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 px-4 border rounded-md text-center transition-colors ${
                          selectedSize === size
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 mt-auto"
              >
                <ShoppingCart size={20} />
                <span>Adicionar ao Carrinho</span>
              </button>

              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p>• Frete grátis para compras acima de R$ 100,00</p>
                <p>• Produto com garantia de qualidade</p>
                <p>• Trocas e devoluções em até 30 dias</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;