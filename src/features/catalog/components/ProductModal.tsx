import { ShoppingCart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { Product } from '../types/product';
import { useToast } from '../../../shared/providers';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductModal = ({ product, isOpen, onClose }: ProductModalProps) => {
  const { dispatch } = useCart();
  const { showToast } = useToast();
  const { getProductSizeStock } = useCatalog();
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    if (!product) {
      setSelectedSize('');
      return;
    }
    const firstAvailableSize =
      product.sizes?.find((size) => getProductSizeStock(product, size) > 0) ??
      product.sizes?.[0] ??
      '';
    setSelectedSize(firstAvailableSize);
  }, [getProductSizeStock, product]);

  if (!isOpen || !product) return null;

  const discount =
    product.discountPercentage ??
    (product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);
  const selectedSizeStock = product.sizes?.length
    ? getProductSizeStock(product, selectedSize)
    : product.stock;
  const isOutOfStock = selectedSizeStock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      alert('Produto sem estoque no momento.');
      return;
    }

    if (product.sizes && !selectedSize) {
      alert('Selecione um tamanho antes de adicionar ao carrinho.');
      return;
    }

    dispatch({
      type: 'ADD_TO_CART',
      payload: { product, size: selectedSize },
    });
    showToast(`${product.name} adicionado ao carrinho.`, { variant: 'success' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />

        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-3xl w-full border border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 z-10"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>

          <div className="grid md:grid-cols-2 gap-6 p-6">
            <div className="relative">
              <img
                src={product.images?.[0] ?? product.image}
                alt={product.name}
                className="w-full h-80 object-cover rounded-xl"
              />
              {discount > 0 && (
                <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  -{discount}% OFF
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                {product.name}
              </h2>

              <div className="mb-4">
                {product.originalPrice && (
                  <p className="text-slate-500 dark:text-slate-400 line-through">
                    R$ {product.originalPrice.toFixed(2)}
                  </p>
                )}
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>

              {product.description && (
                <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">
                  {product.description}
                </p>
              )}
              <p
                className={`mb-4 text-sm font-medium ${
                  isOutOfStock
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isOutOfStock
                  ? product.sizes?.length
                    ? `Sem estoque no tamanho ${selectedSize}`
                    : 'Sem estoque no momento'
                  : product.sizes?.length
                  ? `${selectedSizeStock} unidade(s) disponiveis no tamanho ${selectedSize}`
                  : `${product.stock} unidade(s) disponiveis`}
              </p>

              {product.sizes && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Selecione o tamanho
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        disabled={getProductSizeStock(product, size) <= 0}
                        className={`py-2 px-3 border rounded-xl text-center text-sm font-semibold transition-colors ${
                          selectedSize === size
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                            : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-900 dark:hover:border-slate-500'
                        } ${
                          getProductSizeStock(product, size) <= 0
                            ? 'opacity-40 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        {size} ({getProductSizeStock(product, size)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 mt-auto">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="w-full bg-black hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  {isOutOfStock ? 'Indisponivel' : 'Adicionar ao carrinho'}
                </button>

                <Link
                  to={`/produto/${product.id}`}
                  onClick={onClose}
                  className="w-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors text-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Ver pagina completa
                </Link>
              </div>

              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>Produto com garantia de qualidade.</p>
                <p>Trocas e devolucoes em ate 30 dias.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
