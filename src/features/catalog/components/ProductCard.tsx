import { Heart, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
}

const categoryLabel: Record<Product['category'], string> = {
  basicas: 'Basicas',
  estampadas: 'Estampadas',
  oversized: 'Oversized',
};

const ProductCard = ({ product, onProductClick }: ProductCardProps) => {
  const { dispatch } = useCart();
  const [isLiked, setIsLiked] = useState(false);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const installment = (product.price / 3).toFixed(2);

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (product.sizes && !selectedSize) {
      alert('Selecione um tamanho antes de adicionar ao carrinho.');
      return;
    }
    dispatch({
      type: 'ADD_TO_CART',
      payload: { product, size: selectedSize },
    });
  };

  const handleLike = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsLiked((prev) => !prev);
  };

  return (
    <article
      onClick={() => onProductClick(product)}
      className="group bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-medium"
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="rounded-full bg-white/90 dark:bg-slate-900/90 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {categoryLabel[product.category]}
          </span>
          {discount > 0 && (
            <span className="rounded-full bg-red-500 text-white px-2.5 py-1 text-xs font-bold">
              -{discount}%
            </span>
          )}
        </div>

        <button
          onClick={handleLike}
          className={`absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center transition-colors ${
            isLiked
              ? 'bg-red-500 text-white'
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
          }`}
          aria-label="Favoritar produto"
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-1">
          {product.name}
        </h3>

        <div className="mt-3">
          {product.originalPrice && (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-through">
              R$ {product.originalPrice.toFixed(2)}
            </p>
          )}
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
            R$ {product.price.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ou 3x de R$ {installment} sem juros
          </p>
        </div>

        {product.sizes && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
              Tamanho
            </label>
            <select
              value={selectedSize}
              onChange={(event) => setSelectedSize(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
            >
              {product.sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            Comprar
          </button>
          <Link
            to={`/produto/${product.id}`}
            onClick={(event) => event.stopPropagation()}
            className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition-colors text-center hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Detalhes
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
