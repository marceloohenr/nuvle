import { ArrowRight, BadgePercent } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard, type Product, useCatalog } from '../../features/catalog';

interface HomePageProps {
  onProductClick: (product: Product) => void;
}

const benefits = [
  'Checkout rapido em poucos passos',
  'PIX, credito e debito',
  'Troca e suporte com atendimento humano',
];
const campaignImage = 'https://i.postimg.cc/7Yvy555R/VENHA_CONFERIR.png';

const HomePage = ({ onProductClick }: HomePageProps) => {
  const { products, categories, getCategoryLabel } = useCatalog();
  const featuredProducts = useMemo(() => {
    const flagged = products.filter((product) => Boolean(product.isFeatured));
    return (flagged.length > 0 ? flagged : products).slice(0, 8);
  }, [products]);
  const heroProduct = featuredProducts[0] ?? products[0] ?? null;

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((product) => {
      counts[product.category] = (counts[product.category] ?? 0) + 1;
    });
    return counts;
  }, [products]);

  const categoryRows = useMemo(() => {
    return categories.map((category) => {
      const itemsInCategory = productCountByCategory[category.id] ?? 0;
      const sampleProduct = products.find((product) => product.category === category.id);

      return {
        title: getCategoryLabel(category.id),
        description:
          itemsInCategory > 0
            ? `${itemsInCategory} produto(s) disponivel(is) nesta categoria.`
            : 'Categoria pronta para novos produtos.',
        query: category.id,
        image:
          sampleProduct?.images?.[0] ??
          sampleProduct?.image ??
          'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=80',
      };
    });
  }, [categories, getCategoryLabel, productCountByCategory, products]);

  return (
    <div className="space-y-16">
      <section className="section-reveal relative w-screen ml-[calc(50%-50vw)] overflow-hidden border-y border-slate-200 dark:border-slate-800 shadow-hard">
        <img
          src={campaignImage}
          alt="Campanha Nuvle"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />

        <div className="relative z-10 mx-auto max-w-[1440px] grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16 min-h-[72vh] sm:min-h-[78vh] lg:min-h-[86vh]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 text-white px-4 py-1 text-xs tracking-[0.18em] font-semibold uppercase mb-5">
              <BadgePercent size={16} />
              Drop com preco promocional
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl uppercase tracking-[0.08em] font-bold text-white leading-[0.95]">
              Colecao Nuvle
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-200 max-w-xl">
              A Nuvle mistura shape moderno, caimento premium e compra simples.
              Escolha seu tamanho, feche seu carrinho e acompanhe tudo pela conta.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/produtos"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white hover:bg-slate-200 text-black font-semibold px-5 py-3 rounded-md transition-colors"
              >
                Ver catalogo
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/pedidos"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 border border-white/30 text-slate-100 font-semibold px-5 py-3 rounded-md hover:bg-white/10 transition-colors"
              >
                Acompanhar pedidos
              </Link>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-slate-200">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-white" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/20 bg-black/35 backdrop-blur px-4 sm:px-5 py-4 flex items-center gap-3 self-end max-w-xl">
            <img
              src={heroProduct?.images?.[0] ?? heroProduct?.image ?? 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80'}
              alt={heroProduct?.name ?? 'Destaque Nuvle'}
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-200">Destaque da semana</p>
              <p className="truncate font-semibold text-white">{heroProduct?.name ?? '#USENUVLE'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-reveal stagger-1">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold text-slate-950 dark:text-white">Categorias</h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Escolha uma linha e va direto para os produtos.
            </p>
          </div>
        </div>
        {categoryRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900 p-8 text-center text-slate-600 dark:text-slate-300">
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categoryRows.map(({ title, description, query, image }) => (
              <Link
                key={query}
                to={`/produtos?categoria=${query}`}
                className="group relative h-56 overflow-hidden rounded-md border border-slate-300 dark:border-slate-700"
              >
                <img
                  src={image}
                  alt={title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-3xl uppercase tracking-[0.05em] font-bold text-white truncate">{title}</h3>
                    <p className="mt-1 text-xs text-slate-300">{description}</p>
                  </div>
                  <span className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    Explorar
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-reveal stagger-2">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-700 dark:text-slate-200">
              Em alta
            </p>
            <h2 className="mt-3 text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold text-slate-950 dark:text-white">Pecas selecionadas</h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Pecas selecionadas para voce comecar.
            </p>
          </div>
          <Link
            to="/produtos"
            className="hidden md:inline-flex text-slate-700 dark:text-slate-300 font-semibold hover:text-black dark:hover:text-white"
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

      <section className="section-reveal stagger-3 rounded-md border border-slate-300 dark:border-slate-700 bg-black text-slate-100 p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold">Atendimento rapido e humano</h2>
            <p className="mt-2 text-slate-200">
              Dvidas de tamanho, frete ou troca? A equipe Nuvle responde direto no
              WhatsApp para finalizar seu pedido sem friccao.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href="https://linktr.ee/nuvle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white text-black hover:bg-slate-200 font-semibold px-5 py-3 rounded-md transition-colors"
            >
              Abrir canais oficiais
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-white/20 hover:border-white/40 text-slate-100 font-semibold px-5 py-3 rounded-md transition-colors"
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
