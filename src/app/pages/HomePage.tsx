import { ArrowRight, BadgePercent, Flame } from 'lucide-react';
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
      <section className="section-reveal rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0c1a2f] via-[#080f1f] to-[#050913] shadow-hard">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center p-8 md:p-12 lg:p-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-cyan-400/15 text-cyan-200 px-4 py-1 text-xs tracking-[0.18em] font-semibold uppercase mb-5">
              <BadgePercent size={16} />
              Drop com preco promocional
            </p>
            <h1 className="font-display text-6xl md:text-7xl lg:text-8xl uppercase tracking-wide text-white leading-[0.9]">
              Streetwear com energia de pista
            </h1>
            <p className="mt-4 text-base md:text-lg text-slate-300 max-w-xl">
              A Nuvle mistura shape moderno, caimento premium e compra simples.
              Escolha seu tamanho, feche seu carrinho e acompanhe tudo pela conta.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-200 text-black font-semibold px-5 py-3 rounded-full transition-colors"
              >
                Ver catalogo
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/pedidos"
                className="inline-flex items-center gap-2 border border-white/20 text-slate-100 font-semibold px-5 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                Acompanhar pedidos
              </Link>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-slate-300">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[380px] lg:min-h-[500px] rounded-3xl overflow-hidden border border-white/10">
            <img
              src={heroProduct?.images?.[0] ?? heroProduct?.image ?? 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80'}
              alt="Colecao Nuvle"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute left-5 bottom-5 right-5 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-sm p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                Destaque da semana
              </p>
              <p className="text-2xl font-display uppercase tracking-wide text-white">
                {heroProduct?.name ?? '#USENUVLE'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-reveal stagger-1">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-5xl uppercase tracking-wide text-white">Categorias</h2>
            <p className="text-slate-300 mt-1">
              Escolha uma linha e va direto para os produtos.
            </p>
          </div>
        </div>
        {categoryRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-8 text-center text-slate-300">
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {categoryRows.map(({ title, description, query, image }) => (
              <Link
                key={query}
                to={`/produtos?categoria=${query}`}
                className="group relative h-52 overflow-hidden rounded-3xl border border-white/10"
              >
                <img
                  src={image}
                  alt={title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-3xl uppercase tracking-wide text-white truncate">{title}</h3>
                    <p className="mt-1 text-xs text-slate-300">{description}</p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
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
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] font-semibold text-orange-200">
              <Flame size={14} />
              Em alta
            </p>
            <h2 className="mt-3 font-display text-5xl uppercase tracking-wide text-white">Pecas selecionadas</h2>
            <p className="text-slate-300 mt-1">
              Pecas selecionadas para voce comecar.
            </p>
          </div>
          <Link
            to="/produtos"
            className="hidden md:inline-flex text-cyan-300 font-semibold hover:text-white"
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

      <section className="section-reveal stagger-3 rounded-3xl border border-white/10 bg-gradient-to-r from-[#081323] via-[#0a1a2e] to-[#0c2242] text-slate-100 p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-5xl uppercase tracking-wide">Atendimento rapido e humano</h2>
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
              className="inline-flex items-center justify-center bg-white text-black hover:bg-slate-200 font-semibold px-5 py-3 rounded-full transition-colors"
            >
              Abrir canais oficiais
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-white/20 hover:border-white/40 text-slate-100 font-semibold px-5 py-3 rounded-full transition-colors"
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
