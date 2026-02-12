import { useEffect, useMemo, useState } from 'react';
import { Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  ProductCard,
  type Product,
  useCatalog,
} from '../../features/catalog';

interface ProductsPageProps {
  onProductClick: (product: Product) => void;
}

type PriceFilter = 'all' | 'under-80' | '80-100' | '100-120' | 'over-120';
type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'name-asc';

const ProductsPage = ({ onProductClick }: ProductsPageProps) => {
  const { products, categories, getCategoryLabel } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | string>('all');
  const [selectedSize, setSelectedSize] = useState<'all' | string>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  useEffect(() => {
    const categoryParam = searchParams.get('categoria');
    if (categoryParam && categories.some((category) => category.id === categoryParam)) {
      setActiveCategory(categoryParam);
      return;
    }

    if (categoryParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('categoria');
      setSearchParams(nextParams, { replace: true });
    }

    setActiveCategory('all');
  }, [categories, searchParams, setSearchParams]);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((product) => {
      product.sizes?.forEach((size) => sizes.add(size));
    });
    return Array.from(sizes);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const byPrice = (price: number) => {
      switch (priceFilter) {
        case 'under-80':
          return price < 80;
        case '80-100':
          return price >= 80 && price <= 100;
        case '100-120':
          return price > 100 && price <= 120;
        case 'over-120':
          return price > 120;
        default:
          return true;
      }
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const result = products.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || product.category === activeCategory;
      const matchesSize =
        selectedSize === 'all' || product.sizes?.includes(selectedSize);
      const matchesPrice = byPrice(product.price);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSize && matchesPrice && matchesSearch;
    });

    switch (sortBy) {
      case 'price-asc':
        return [...result].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...result].sort((a, b) => b.price - a.price);
      case 'name-asc':
        return [...result].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return result;
    }
  }, [activeCategory, priceFilter, products, searchTerm, selectedSize, sortBy]);

  const updateCategory = (category: 'all' | string) => {
    setActiveCategory(category);
    const params = new URLSearchParams(searchParams);
    if (category === 'all') {
      params.delete('categoria');
    } else {
      params.set('categoria', category);
    }
    setSearchParams(params, { replace: true });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSize('all');
    setPriceFilter('all');
    setSortBy('recommended');
    updateCategory('all');
  };

  const activeFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (selectedSize !== 'all' ? 1 : 0) +
    (priceFilter !== 'all' ? 1 : 0) +
    (searchTerm.trim().length > 0 ? 1 : 0);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 md:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Catalogo completo
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mt-2">
              Encontre a peca certa para seu estilo
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3 max-w-2xl">
              Refine por categoria, tamanho e faixa de preco para chegar mais
              rapido no que voce procura.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
              resultados
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {filteredProducts.length}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome ou categoria"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-slate-500 dark:text-slate-400" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 px-3 text-slate-800 dark:text-slate-100"
            >
              <option value="recommended">Mais relevantes</option>
              <option value="price-asc">Menor preco</option>
              <option value="price-desc">Maior preco</option>
              <option value="name-asc">Nome A-Z</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Categoria
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateCategory('all')}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => updateCategory(category.id)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                    activeCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {getCategoryLabel(category.id)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Tamanho
            </p>
            <select
              value={selectedSize}
              onChange={(event) => setSelectedSize(event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 px-3 text-slate-800 dark:text-slate-100"
            >
              <option value="all">Todos os tamanhos</option>
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Faixa de preco
            </p>
            <select
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 px-3 text-slate-800 dark:text-slate-100"
            >
              <option value="all">Todas</option>
              <option value="under-80">Abaixo de R$ 80</option>
              <option value="80-100">R$ 80 ate R$ 100</option>
              <option value="100-120">R$ 100 ate R$ 120</option>
              <option value="over-120">Acima de R$ 120</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Filter size={14} />
            {activeFilterCount} filtro(s) ativos
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      <section>
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">
              Nenhum produto encontrado
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Ajuste os filtros para tentar uma nova combinacao.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Limpar e mostrar todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={onProductClick}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductsPage;
