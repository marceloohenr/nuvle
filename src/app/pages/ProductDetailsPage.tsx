import {
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCart } from '../../features/cart';
import { useCatalog } from '../../features/catalog';

const reviews = [
  {
    author: 'Cliente Nuvle',
    rating: 5,
    text: 'Malha muito boa, veste bem e chegou rapido.',
  },
  {
    author: 'Comprador verificado',
    rating: 5,
    text: 'Caimento excelente, principalmente nos modelos oversized.',
  },
  {
    author: 'Cliente recorrente',
    rating: 4,
    text: 'Atendimento rapido e troca sem burocracia.',
  },
];

const faqItems = [
  {
    question: 'Como escolher o tamanho ideal?',
    answer:
      'Use a tabela de medidas nesta pagina e compare com uma camiseta que voce ja usa.',
  },
  {
    question: 'Qual o prazo de envio?',
    answer:
      'O envio e combinado no atendimento via WhatsApp apos confirmacao do pagamento.',
  },
  {
    question: 'Posso trocar se nao servir?',
    answer:
      'Sim. A loja aceita trocas em ate 30 dias para produtos sem sinais de uso.',
  },
];

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const { dispatch } = useCart();
  const { products, getCategoryLabel } = useCatalog();

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [productId, products]
  );

  const [selectedSize, setSelectedSize] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center animate-fade-in">
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
  const isOutOfStock = product.stock <= 0;
  const installment = (product.price / 3).toFixed(2);
  const relatedProducts = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  const addToCart = () => {
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
  };

  return (
    <div className="space-y-10 animate-fade-in">
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
            {getCategoryLabel(product.category)}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {product.name}
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            {product.description || 'Peca premium com acabamento de alta qualidade.'}
          </p>
          <p
            className={`mt-3 text-sm font-medium ${
              isOutOfStock
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isOutOfStock ? 'Sem estoque no momento' : `${product.stock} unidade(s) disponiveis`}
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
              disabled={isOutOfStock}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              {isOutOfStock ? 'Indisponivel' : 'Adicionar ao carrinho'}
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

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Avaliacoes</h2>
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <div
                key={review.author + review.text}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`${review.author}-${index}`}
                      size={14}
                      className={
                        index < review.rating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300 dark:text-slate-600'
                      }
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{review.text}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {review.author}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">FAQ</h2>
          <div className="mt-4 space-y-2">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={item.question}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {item.question}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
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
