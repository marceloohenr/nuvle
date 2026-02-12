import { ArrowLeft, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCart } from '../../features/cart';
import { products } from '../../features/catalog';
import type { Product } from '../../features/catalog';

const categoryLabel: Record<Product['category'], string> = {
  basicas: 'Basicas',
  estampadas: 'Estampadas',
  oversized: 'Oversized',
};

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const { dispatch } = useCart();

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [productId]
  );

  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    if (product?.sizes?.length) {
      setSelectedSize(product.sizes[0]);
      return;
    }
    setSelectedSize('');
  }, [product]);

  if (!productId) {
    return <Navigate to="/produtos" replace />;
  }

  if (!product) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Produto nao encontrado
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          O item procurado nao existe ou foi removido do catalogo.
        </p>
        <Link
          to="/produtos"
          className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para produtos
        </Link>
      </section>
    );
  }

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const installment = (product.price / 3).toFixed(2);
  const relatedProducts = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  const addToCart = () => {
    if (product.sizes && !selectedSize) {
      alert('Selecione um tamanho antes de adicionar ao carrinho.');
      return;
    }

    dispatch({
      type: 'ADD_TO_CART',
      payload: { product, size: selectedSize },
    });
  };

  return (
    <div className="space-y-10">
      <div>
        <Link
          to="/produtos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar para catalogo
        </Link>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-[520px] object-cover rounded-2xl"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
          <p className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            {categoryLabel[product.category]}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {product.name}
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            {product.description || 'Peca premium com acabamento de alta qualidade.'}
          </p>

          <div className="mt-6">
            {product.originalPrice && (
              <p className="text-lg text-slate-500 dark:text-slate-400 line-through">
                R$ {product.originalPrice.toFixed(2)}
              </p>
            )}
            <div className="flex items-center gap-3">
              <p className="text-4xl font-black text-blue-600 dark:text-blue-400">
                R$ {product.price.toFixed(2)}
              </p>
              {discount > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-3 py-1 text-xs font-bold">
                  -{discount}% OFF
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              ou 3x de R$ {installment} sem juros
            </p>
          </div>

          {product.sizes && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Tamanho
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                      selectedSize === size
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 grid gap-3">
            <button
              onClick={addToCart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              Adicionar ao carrinho
            </button>
            <a
              href="https://linktr.ee/nuvle"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center"
            >
              Tirar duvidas no WhatsApp
            </a>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
              <Truck className="text-blue-600 dark:text-blue-400" size={18} />
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Envio com suporte humano
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Frete combinado direto no atendimento.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={18} />
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Troca em ate 30 dias
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Produto com garantia de qualidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Guia rapido de caimento
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
          Medidas aproximadas para te ajudar a escolher o tamanho ideal.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[520px]">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="py-2">Tamanho</th>
                <th className="py-2">Largura</th>
                <th className="py-2">Comprimento</th>
                <th className="py-2">Manga</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-200">
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-2 font-medium">P</td>
                <td className="py-2">53 cm</td>
                <td className="py-2">71 cm</td>
                <td className="py-2">22 cm</td>
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-2 font-medium">M</td>
                <td className="py-2">56 cm</td>
                <td className="py-2">73 cm</td>
                <td className="py-2">23 cm</td>
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-2 font-medium">G</td>
                <td className="py-2">59 cm</td>
                <td className="py-2">75 cm</td>
                <td className="py-2">24 cm</td>
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-2 font-medium">GG</td>
                <td className="py-2">62 cm</td>
                <td className="py-2">77 cm</td>
                <td className="py-2">25 cm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Produtos relacionados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/produto/${item.id}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:-translate-y-1 transition-all"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-44 object-cover"
                />
                <div className="p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                    R$ {item.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailsPage;
