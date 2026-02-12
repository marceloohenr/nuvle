import {
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useCatalog } from '../../features/catalog';
import {
  getLocalOrders,
  orderPaymentLabel,
  orderStatusLabel,
  removeLocalOrder,
  updateLocalOrderStatus,
} from '../../features/orders';
import type { LocalOrder, OrderStatus } from '../../features/orders';

type AdminTab = 'products' | 'orders' | 'customers';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const statusOptions: OrderStatus[] = [
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
];

const AdminPage = () => {
  const { currentUser, isAdmin, users } = useAuth();
  const {
    products,
    categories,
    addProduct,
    addCategory,
    removeCategory,
    getCategoryLabel,
    updateProduct,
    adjustProductStock,
    removeProduct,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [productEditMessage, setProductEditMessage] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    image: '',
    category: '',
    price: '',
    originalPrice: '',
    stock: '20',
    sizes: 'P,M,G,GG',
    description: '',
  });

  const refreshOrders = () => {
    setOrders(getLocalOrders());
  };

  useEffect(() => {
    refreshOrders();
  }, []);

  useEffect(() => {
    setNewProduct((previous) => {
      if (categories.length === 0) {
        if (!previous.category) return previous;
        return { ...previous, category: '' };
      }

      const hasSelectedCategory = categories.some(
        (category) => category.id === previous.category
      );

      if (hasSelectedCategory) return previous;
      return { ...previous, category: categories[0].id };
    });
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [productSearch, products]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        order.customer.name.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.customer.city.toLowerCase().includes(query)
    );
  }, [orderSearch, orders]);

  const categoriesWithCount = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.id).length,
    }));
  }, [categories, products]);

  const customerRows = useMemo(() => {
    type CustomerRow = {
      email: string;
      name: string;
      phone: string;
      cpf: string;
      city: string;
      state: string;
      ordersCount: number;
      totalSpent: number;
      registeredAt: string | null;
      lastOrderAt: string | null;
    };

    const byEmail = new Map<string, CustomerRow>();

    users.forEach((user) => {
      if (user.role !== 'customer') return;

      const key = user.email.toLowerCase();
      byEmail.set(key, {
        email: user.email,
        name: user.name,
        phone: '-',
        cpf: '-',
        city: '-',
        state: '-',
        ordersCount: 0,
        totalSpent: 0,
        registeredAt: user.createdAt,
        lastOrderAt: null,
      });
    });

    orders.forEach((order) => {
      const key = order.customer.email.toLowerCase();
      const existing = byEmail.get(key);

      if (!existing) {
        byEmail.set(key, {
          email: order.customer.email,
          name: order.customer.name,
          phone: order.customer.phone,
          cpf: order.customer.cpf,
          city: order.customer.city,
          state: order.customer.state,
          ordersCount: 1,
          totalSpent: order.total,
          registeredAt: null,
          lastOrderAt: order.createdAt,
        });
        return;
      }

      existing.name = order.customer.name || existing.name;
      existing.phone = order.customer.phone || existing.phone;
      existing.cpf = order.customer.cpf || existing.cpf;
      existing.city = order.customer.city || existing.city;
      existing.state = order.customer.state || existing.state;
      existing.ordersCount += 1;
      existing.totalSpent += order.total;

      if (!existing.lastOrderAt || new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
        existing.lastOrderAt = order.createdAt;
      }
    });

    return Array.from(byEmail.values()).sort((a, b) => {
      if (!a.lastOrderAt && !b.lastOrderAt) return 0;
      if (!a.lastOrderAt) return 1;
      if (!b.lastOrderAt) return -1;
      return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
    });
  }, [orders, users]);

  const orderStats = useMemo(() => {
    return {
      total: orders.length,
      open: orders.filter((order) => order.status !== 'delivered').length,
      revenue: orders.reduce((sum, order) => sum + order.total, 0),
    };
  }, [orders]);

  const handleCreateCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = addCategory(newCategoryName);

    if (!result.success) {
      setCategoryMessage(result.error ?? 'Nao foi possivel criar a categoria.');
      return;
    }

    setCategoryMessage(`Categoria "${result.category?.label}" criada com sucesso.`);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (categoryId: string) => {
    const label = getCategoryLabel(categoryId);
    const result = removeCategory(categoryId);

    if (!result.success) {
      setCategoryMessage(result.error ?? 'Nao foi possivel remover a categoria.');
      return;
    }

    setCategoryMessage(`Categoria "${label}" removida.`);
  };

  const handleCreateProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = addProduct({
      name: newProduct.name,
      image: newProduct.image,
      category: newProduct.category,
      price: Number(newProduct.price),
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
      stock: Number(newProduct.stock),
      description: newProduct.description,
      sizes: newProduct.sizes
        .split(',')
        .map((size) => size.trim().toUpperCase())
        .filter(Boolean),
    });

    if (!result.success) {
      setFormMessage(result.error ?? 'Nao foi possivel adicionar o produto.');
      return;
    }

    setFormMessage('Produto cadastrado com sucesso.');
    setNewProduct((prev) => ({
      ...prev,
      name: '',
      image: '',
      price: '',
      originalPrice: '',
      description: '',
      stock: '20',
      sizes: 'P,M,G,GG',
    }));
  };

  const startEditingProduct = (
    productId: string,
    currentName: string,
    currentDescription?: string
  ) => {
    setEditingProductId(productId);
    setEditingProductName(currentName);
    setEditingProductDescription(currentDescription ?? '');
    setProductEditMessage('');
  };

  const cancelEditingProduct = () => {
    setEditingProductId(null);
    setEditingProductName('');
    setEditingProductDescription('');
  };

  const handleSaveProductEdit = (productId: string) => {
    const nextName = editingProductName.trim();
    const nextDescription = editingProductDescription.trim();

    if (nextName.length < 3) {
      setProductEditMessage('Nome do produto precisa ter ao menos 3 caracteres.');
      return;
    }

    const updated = updateProduct(productId, {
      name: nextName,
      description: nextDescription,
    });

    if (!updated) {
      setProductEditMessage('Nao foi possivel atualizar este produto.');
      return;
    }

    setProductEditMessage('Produto atualizado com sucesso.');
    cancelEditingProduct();
  };

  if (!currentUser) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Acesso restrito</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Esta area e exclusiva para administradores da loja.
        </p>
        <Link
          to="/conta"
          className="mt-5 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          Voltar para minha conta
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Painel administrativo
            </p>
            <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
              Controle da operacao Nuvle
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Gerencie estoque, produtos, pedidos e dados dos clientes cadastrados.
            </p>
          </div>

          <button
            onClick={refreshOrders}
            className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={15} />
            Atualizar dados
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Produtos
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{products.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Pedidos
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{orderStats.total}</p>
          </article>
          <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Em andamento
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{orderStats.open}</p>
          </article>
          <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Receita
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {currencyFormatter.format(orderStats.revenue)}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            onClick={() => setActiveTab('products')}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Produtos e estoque
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Pedidos da loja
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Clientes cadastrados
          </button>
        </div>
      </section>

      {activeTab === 'products' && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Buscar produto por nome ou categoria"
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            {productEditMessage && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{productEditMessage}</p>
            )}

            <div className="mt-4 space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
                >
                  <div className="flex gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getCategoryLabel(product.category)} | {currencyFormatter.format(product.price)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {product.description || 'Sem descricao cadastrada.'}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Estoque: {product.stock}
                        </span>
                        <button
                          onClick={() => adjustProductStock(product.id, -10)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => adjustProductStock(product.id, -1)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => adjustProductStock(product.id, 1)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => adjustProductStock(product.id, 10)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          +10
                        </button>
                        <button
                          onClick={() =>
                            startEditingProduct(product.id, product.name, product.description)
                          }
                          className="rounded-lg border border-blue-200 dark:border-blue-900 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        >
                          Editar
                        </button>
                      </div>

                      {editingProductId === product.id && (
                        <div className="mt-3 space-y-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 p-3">
                          <input
                            value={editingProductName}
                            onChange={(event) => setEditingProductName(event.target.value)}
                            placeholder="Novo nome"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                          />
                          <textarea
                            value={editingProductDescription}
                            onChange={(event) =>
                              setEditingProductDescription(event.target.value)
                            }
                            placeholder="Nova descricao"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-20"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveProductEdit(product.id)}
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-semibold transition-colors"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={cancelEditingProduct}
                              className="rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeProduct(product.id)}
                      className="h-9 w-9 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 grid place-items-center hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label={`Remover ${product.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}

              {filteredProducts.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhum produto encontrado com esse filtro.
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-fit sticky top-28 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Gerenciar categorias
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Adicione ou remova categorias como camisas, bermudas e regatas.
              </p>

              <form onSubmit={handleCreateCategory} className="mt-3 flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Nova categoria"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Criar
                </button>
              </form>

              <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                {categoriesWithCount.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {category.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {category.count} produto(s)
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(category.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {categoryMessage && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{categoryMessage}</p>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Cadastrar novo produto
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Inclua imagem, preco, categoria e tamanhos para publicar no catalogo.
              </p>

              <form onSubmit={handleCreateProduct} className="mt-4 space-y-3">
                <input
                  value={newProduct.name}
                  onChange={(event) =>
                    setNewProduct((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Nome do produto"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
                <input
                  value={newProduct.image}
                  onChange={(event) =>
                    setNewProduct((prev) => ({ ...prev, image: event.target.value }))
                  }
                  placeholder="URL da imagem"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={newProduct.price}
                    onChange={(event) =>
                      setNewProduct((prev) => ({ ...prev, price: event.target.value }))
                    }
                    placeholder="Preco"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <input
                    value={newProduct.originalPrice}
                    onChange={(event) =>
                      setNewProduct((prev) => ({ ...prev, originalPrice: event.target.value }))
                    }
                    placeholder="Preco original (opcional)"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={newProduct.category}
                    onChange={(event) =>
                      setNewProduct((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                    disabled={categories.length === 0}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                  >
                    {categories.length === 0 ? (
                      <option value="">Cadastre uma categoria primeiro</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))
                    )}
                  </select>
                  <input
                    value={newProduct.stock}
                    onChange={(event) =>
                      setNewProduct((prev) => ({ ...prev, stock: event.target.value }))
                    }
                    placeholder="Estoque inicial"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <input
                  value={newProduct.sizes}
                  onChange={(event) =>
                    setNewProduct((prev) => ({ ...prev, sizes: event.target.value }))
                  }
                  placeholder="Tamanhos (P,M,G,GG)"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
                <textarea
                  value={newProduct.description}
                  onChange={(event) =>
                    setNewProduct((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Descricao"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100 min-h-24"
                />

                {formMessage && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{formMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={categories.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  <PlusCircle size={16} />
                  Adicionar produto
                </button>
              </form>
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'orders' && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Buscar por pedido, nome ou e-mail"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              onClick={refreshOrders}
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar pedidos
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Pedido #{order.id}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {order.customer.name} | {order.customer.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {order.customer.phone} | {order.customer.city} - {order.customer.state}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {currencyFormatter.format(order.total)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {orderPaymentLabel[order.paymentMethod]}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <select
                    value={order.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as OrderStatus;
                      updateLocalOrderStatus(order.id, nextStatus);
                      refreshOrders();
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {orderStatusLabel[status]}
                      </option>
                    ))}
                  </select>

                  <Link
                    to={`/pedidos/${order.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Detalhes
                  </Link>

                  <button
                    onClick={() => {
                      removeLocalOrder(order.id);
                      refreshOrders();
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 dark:border-red-900 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Remover
                  </button>
                </div>
              </article>
            ))}

            {filteredOrders.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum pedido encontrado para o filtro informado.
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'customers' && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Base de clientes</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Dados unificados dos cadastros e dos pedidos ja realizados.
          </p>

          <div className="mt-4 space-y-3">
            {customerRows.map((customer) => (
              <article
                key={customer.email}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 grid place-items-center">
                      <UserCircle2 size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{customer.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {customer.phone} | CPF: {customer.cpf}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {customer.city} - {customer.state}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {customer.ordersCount} pedido(s)
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 font-semibold">
                      {currencyFormatter.format(customer.totalSpent)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Cadastro:{' '}
                    {customer.registeredAt
                      ? dateFormatter.format(new Date(customer.registeredAt))
                      : 'sem cadastro local'}
                  </span>
                  <span>
                    Ultimo pedido:{' '}
                    {customer.lastOrderAt
                      ? dateFormatter.format(new Date(customer.lastOrderAt))
                      : 'sem pedidos'}
                  </span>
                </div>
              </article>
            ))}

            {customerRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum cliente encontrado.
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-5 text-sm text-emerald-700 dark:text-emerald-300">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={16} />
          Ambiente administrativo local
        </p>
        <p className="mt-1">
          Todas as alteracoes ficam salvas no navegador. Quando integrar backend, este painel pode reaproveitar o mesmo layout.
        </p>
      </section>
    </div>
  );
};

export default AdminPage;
