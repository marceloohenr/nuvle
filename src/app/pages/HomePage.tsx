import { ArrowRight, BadgePercent, Shirt, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard, products, type Product } from '../../features/catalog';

interface HomePageProps {
  onProductClick: (product: Product) => void;
}

const featuredProducts = products.slice(0, 8);

const categoryHighlights = [
  {
    title: 'Basicas',
    description: 'Modelos limpos para uso diario com foco em conforto.',
    query: 'basicas',
    icon: Shirt,
  },
  {
    title: 'Estampadas',
    description: 'Pecas com identidade visual forte e grafismos autorais.',
    query: 'estampadas',
    icon: Sparkles,
  },
  {
    title: 'Oversized',
    description: 'Caimento amplo para um look mais urbano e moderno.',
    query: 'oversized',
    icon: Truck,
  },
];

const benefits = [
  'Checkout simples e rapido',
  'Pagamento via PIX, credito e debito',
  'Frete negociado com atendimento humano',
];

const HomePage = ({ onProductClick }: HomePageProps) => {
  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-soft p-8 md:p-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-4 py-1 text-sm font-medium mb-5">
              <BadgePercent size={16} />
              Lote com precos promocionais
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Vista a identidade da Nuvle sem abrir mao do conforto.
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-xl">
              Uma loja digital mais organizada para voce explorar catalogo, comparar
              modelos e finalizar sua compra com rapidez.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                Ver catalogo completo
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/pedidos"
                className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Acompanhar pedidos
              </Link>
            </div>
            <ul className="mt-8 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <img
              src="https://i.postimg.cc/T3JgbyjR/VENHA-CONFERIR.png"
              alt="Colecao Nuvle"
              className="w-full h-[380px] object-cover rounded-2xl shadow-hard"
            />
            <div className="absolute -bottom-5 -left-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 shadow-medium">
              <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Destaque
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">#USENUVLE</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Categorias</h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Escolha uma linha e va direto para os produtos.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categoryHighlights.map(({ title, description, query, icon: Icon }) => (
            <Link
              key={query}
              to={`/produtos?categoria=${query}`}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-blue-400 dark:hover:border-blue-500 hover:-translate-y-1 transition-all"
            >
              <Icon className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">{description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                Explorar
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Em alta</h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Pecas selecionadas para voce comecar.
            </p>
          </div>
          <Link
            to="/produtos"
            className="hidden md:inline-flex text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Ver todos os produtos
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-900 text-slate-100 p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold">Atendimento rapido e humano</h2>
            <p className="mt-2 text-slate-300">
              Dvidas de tamanho, frete ou troca? A equipe Nuvle responde direto no
              WhatsApp para finalizar seu pedido sem friccao.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href="https://linktr.ee/nuvle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              Abrir canais oficiais
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-slate-600 hover:border-slate-400 text-slate-100 font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              Entrar na conta
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
