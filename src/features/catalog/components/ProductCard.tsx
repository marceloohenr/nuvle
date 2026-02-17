import { Heart, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { Product } from '../types/product';
import { useCatalog } from '../context/CatalogContext';
import { useToast } from '../../../shared/providers';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
}

const ProductCard = ({ product, onProductClick }: ProductCardProps) => {
  const { dispatch } = useCart();
  const { showToast } = useToast();
  const { getCategoryLabel, getProductSizeStock } = useCatalog();
  const [isLiked, setIsLiked] = useState(false);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] ?? 'UN');
  const selectedSizeStock = getProductSizeStock(product, selectedSize);
  const isOutOfStock = selectedSizeStock <= 0;

  const discount =
    product.discountPercentage ??
    (product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();

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
  };

  const handleLike = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsLiked((prev) => !prev);
  };

  return (
    <article
      onClick={() => onProductClick(product)}
      className="group rounded-3xl shadow-medium border overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-hard bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
    >
      <div className="relative">
        <img
          src={product.images?.[0] ?? product.image}
          alt={product.name}
          className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="rounded-full bg-white/95 border border-slate-300 px-3 py-1 text-[11px] uppercase tracking-wider font-semibold text-slate-800 dark:bg-black/70 dark:border-slate-600 dark:text-slate-100">
            {getCategoryLabel(product.category)}
          </span>
          {discount > 0 && (
            <span className="rounded-md bg-red-500 text-white px-2.5 py-1 text-xs font-bold">
              -{discount}%
            </span>
          )}
          {product.isFeatured && (
            <span className="rounded-md bg-cyan-300 text-black px-2.5 py-1 text-xs font-black uppercase tracking-wide">
              Em alta
            </span>
          )}
        </div>

        <button
          onClick={handleLike}
          className={`absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center border transition-colors ${
            isLiked
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-white dark:bg-black/70 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-black/85'
          }`}
          aria-label="Favoritar produto"
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white line-clamp-1">
          {product.name}
        </h3>
        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {product.sizes?.length
            ? isOutOfStock
              ? `Sem estoque no tamanho ${selectedSize}`
              : `${selectedSizeStock} unidade(s) no tamanho ${selectedSize}`
            : isOutOfStock
            ? 'Sem estoque'
            : `${product.stock} unidade(s) em estoque`}
        </p>

        <div className="mt-3">
          {product.originalPrice && (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-through">
              R$ {product.originalPrice.toFixed(2)}
            </p>
          )}
          <p className="text-3xl font-black text-sky-700 dark:text-cyan-200">
            R$ {product.price.toFixed(2)}
          </p>
        </div>

        {product.sizes && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">
              Tamanho
            </label>
            <select
              value={selectedSize}
              onChange={(event) => setSelectedSize(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              {product.sizes.map((size) => (
                <option
                  key={size}
                  value={size}
                  disabled={getProductSizeStock(product, size) <= 0}
                >
                  {size} ({getProductSizeStock(product, size)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-500 disabled:text-slate-800 font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            {isOutOfStock ? 'Indisponivel' : 'Comprar'}
          </button>
          <Link
            to={`/produto/${product.id}`}
            onClick={(event) => event.stopPropagation()}
            className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold py-2.5 px-4 rounded-md transition-colors text-center hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Detalhes
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
