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
  type SocialPlatform,
  useStoreSettings,
} from '../../features/settings';
import {
  getLocalOrders,
  orderPaymentLabel,
  orderStatusLabel,
  removeLocalOrder,
  updateLocalOrderStatus,
} from '../../features/orders';
import type { LocalOrder, OrderStatus } from '../../features/orders';

type AdminTab = 'products' | 'orders' | 'customers' | 'settings';

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

const socialPlatforms: Array<{ id: SocialPlatform; label: string }> = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'linkedin', label: 'LinkedIn' },
];

const AdminPage = () => {
  const { currentUser, isAdmin, users } = useAuth();
  const { settings, setSettings } = useStoreSettings();
  const {
    products,
    categories,
    addProduct,
    addCategory,
    removeCategory,
    getCategoryLabel,
    updateProduct,
    adjustProductStockBySize,
    removeProduct,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [productEditMessage, setProductEditMessage] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [contactDraft, setContactDraft] = useState(settings.contact);
  const [socialDraft, setSocialDraft] = useState(settings.socialLinks);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');
  const [editingProductBasePrice, setEditingProductBasePrice] = useState('');
  const [editingProductDiscount, setEditingProductDiscount] = useState('');
  const [editingProductSizeGuide, setEditingProductSizeGuide] = useState<
    Record<string, { widthCm: string; lengthCm: string; sleeveCm: string }>
  >({});
  const [newProduct, setNewProduct] = useState({
    name: '',
    image: '',
    category: '',
    basePrice: '',
    discountPercentage: '',
    stock: '20',
    sizes: 'P,M,G,GG',
    description: '',
  });

  const refreshOrders = async () => {
    setOrders(await getLocalOrders());
  };

  useEffect(() => {
    void refreshOrders();
  }, []);

  useEffect(() => {
    setContactDraft(settings.contact);
    setSocialDraft(settings.socialLinks);
  }, [settings]);

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

  const handleContactDraftChange = (
    field: keyof typeof contactDraft,
    value: string
  ) => {
    setContactDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSocialDraftChange = (platform: SocialPlatform, value: string) => {
    setSocialDraft((previous) => ({
      ...previous,
      [platform]: value,
    }));
  };

  const handleSaveStoreSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sanitizedContact = {
      whatsappLabel: contactDraft.whatsappLabel.trim(),
      whatsappUrl: contactDraft.whatsappUrl.trim(),
      email: contactDraft.email.trim(),
      handle: contactDraft.handle.trim(),
    };

    const sanitizedSocial = socialPlatforms.reduce<typeof socialDraft>(
      (accumulator, platform) => {
        accumulator[platform.id] = socialDraft[platform.id].trim();
        return accumulator;
      },
      {
        tiktok: '',
        instagram: '',
        x: '',
        facebook: '',
        whatsapp: '',
        linkedin: '',
      }
    );

    if (sanitizedContact.whatsappLabel.length < 6) {
      setSettingsMessage('Informe um telefone WhatsApp valido.');
      return;
    }

    if (
      sanitizedContact.email.length < 5 ||
      !sanitizedContact.email.includes('@') ||
      !sanitizedContact.email.includes('.')
    ) {
      setSettingsMessage('Informe um e-mail valido para contato.');
      return;
    }

    if (sanitizedContact.handle.length < 3) {
      setSettingsMessage('Informe um identificador de perfil valido (ex.: @nuvleoficial).');
      return;
    }

    setSettings({
      contact: sanitizedContact,
      socialLinks: sanitizedSocial,
    });

    setSettingsMessage('Configuracoes de contato atualizadas com sucesso.');
  };

  const handleCreateProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const basePrice = Number(newProduct.basePrice);
    const discountPercentage = Number(newProduct.discountPercentage || 0);
    const normalizedSizes = newProduct.sizes
      .split(',')
      .map((size) => size.trim().toUpperCase())
      .filter(Boolean);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setFormMessage('Informe um preco base valido.');
      return;
    }

    if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 95) {
      setFormMessage('O desconto precisa estar entre 0% e 95%.');
      return;
    }

    if (normalizedSizes.length === 0) {
      setFormMessage('Informe ao menos um tamanho para o produto.');
      return;
    }

    const result = addProduct({
      name: newProduct.name,
      image: newProduct.image,
      category: newProduct.category,
      price: basePrice,
      originalPrice: basePrice,
      discountPercentage,
      stock: Number(newProduct.stock),
      description: newProduct.description,
      sizes: normalizedSizes,
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
      basePrice: '',
      discountPercentage: '',
      description: '',
      stock: '20',
      sizes: 'P,M,G,GG',
    }));
  };

  const startEditingProduct = (
    product: {
      id: string;
      name: string;
      description?: string;
      originalPrice?: number;
      price: number;
      discountPercentage?: number;
      sizeGuide?: Array<{ size: string; widthCm: number; lengthCm: number; sleeveCm: number }>;
      sizes?: string[];
    }
  ) => {
    setEditingProductId(product.id);
    setEditingProductName(product.name);
    setEditingProductDescription(product.description ?? '');
    setEditingProductBasePrice(String(product.originalPrice ?? product.price));
    setEditingProductDiscount(String(product.discountPercentage ?? 0));
    const sizes = product.sizes?.length ? product.sizes : ['UN'];
    const guideBySize = sizes.reduce<
      Record<string, { widthCm: string; lengthCm: string; sleeveCm: string }>
    >((accumulator, size) => {
      const currentGuide = product.sizeGuide?.find((row) => row.size === size);
      accumulator[size] = {
        widthCm: String(currentGuide?.widthCm ?? ''),
        lengthCm: String(currentGuide?.lengthCm ?? ''),
        sleeveCm: String(currentGuide?.sleeveCm ?? ''),
      };
      return accumulator;
    }, {});
    setEditingProductSizeGuide(guideBySize);
    setProductEditMessage('');
  };

  const cancelEditingProduct = () => {
    setEditingProductId(null);
    setEditingProductName('');
    setEditingProductDescription('');
    setEditingProductBasePrice('');
    setEditingProductDiscount('');
    setEditingProductSizeGuide({});
  };

  const handleGuideChange = (
    size: string,
    field: 'widthCm' | 'lengthCm' | 'sleeveCm',
    value: string
  ) => {
    setEditingProductSizeGuide((previous) => ({
      ...previous,
      [size]: {
        widthCm: previous[size]?.widthCm ?? '',
        lengthCm: previous[size]?.lengthCm ?? '',
        sleeveCm: previous[size]?.sleeveCm ?? '',
        [field]: value,
      },
    }));
  };

  const handleSaveProductEdit = (
    productId: string,
    sizes: string[] | undefined,
    stockBySize: Record<string, number> | undefined
  ) => {
    const nextName = editingProductName.trim();
    const nextDescription = editingProductDescription.trim();
    const basePrice = Number(editingProductBasePrice);
    const discountPercentage = Number(editingProductDiscount || 0);
    const sizeList = sizes?.length ? sizes : ['UN'];

    if (nextName.length < 3) {
      setProductEditMessage('Nome do produto precisa ter ao menos 3 caracteres.');
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setProductEditMessage('Preco base precisa ser maior que zero.');
      return;
    }

    if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 95) {
      setProductEditMessage('Desconto deve estar entre 0% e 95%.');
      return;
    }

    const nextGuide = sizeList.map((size) => ({
      size,
      widthCm: Number(editingProductSizeGuide[size]?.widthCm || 0),
      lengthCm: Number(editingProductSizeGuide[size]?.lengthCm || 0),
      sleeveCm: Number(editingProductSizeGuide[size]?.sleeveCm || 0),
    }));

    const updated = updateProduct(productId, {
      name: nextName,
      description: nextDescription,
      price: basePrice,
      originalPrice: basePrice,
      discountPercentage,
      sizeGuide: nextGuide,
      stockBySize,
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
            onClick={() => {
              void refreshOrders();
            }}
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
        <div className="grid gap-2 sm:grid-cols-4">
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Contato e redes
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
              {filteredProducts.map((product) => {
                const productSizes = product.sizes?.length ? product.sizes : ['UN'];
                const productDiscount =
                  product.discountPercentage ??
                  (product.originalPrice
                    ? Math.round((1 - product.price / product.originalPrice) * 100)
                    : 0);

                return (
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
                          {productDiscount > 0 ? ` | ${productDiscount}% OFF` : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {product.description || 'Sem descricao cadastrada.'}
                        </p>

                        <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Estoque por tamanho (total: {product.stock})
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {productSizes.map((size) => {
                              const currentStock = Number(product.stockBySize?.[size] ?? 0);

                              return (
                                <div
                                  key={`${product.id}-${size}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs"
                                >
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {size}
                                  </span>
                                  <button
                                    onClick={() => adjustProductStockBySize(product.id, size, -1)}
                                    className="h-5 w-5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                  >
                                    -
                                  </button>
                                  <span className="min-w-5 text-center text-slate-700 dark:text-slate-200">
                                    {currentStock}
                                  </span>
                                  <button
                                    onClick={() => adjustProductStockBySize(product.id, size, 1)}
                                    className="h-5 w-5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => startEditingProduct(product)}
                            className="rounded-lg border border-blue-200 dark:border-blue-900 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            Editar produto
                          </button>
                        </div>

                        {editingProductId === product.id && (
                          <div className="mt-3 space-y-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 p-3">
                            <input
                              value={editingProductName}
                              onChange={(event) => setEditingProductName(event.target.value)}
                              placeholder="Nome do produto"
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                            />
                            <textarea
                              value={editingProductDescription}
                              onChange={(event) =>
                                setEditingProductDescription(event.target.value)
                              }
                              placeholder="Descricao do produto"
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-20"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                value={editingProductBasePrice}
                                onChange={(event) => setEditingProductBasePrice(event.target.value)}
                                placeholder="Preco base"
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                              />
                              <input
                                value={editingProductDiscount}
                                onChange={(event) => setEditingProductDiscount(event.target.value)}
                                placeholder="Desconto (%)"
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                Guia rapido de caimento deste produto
                              </p>
                              <div className="mt-2 space-y-2">
                                {productSizes.map((size) => (
                                  <div
                                    key={`guide-${product.id}-${size}`}
                                    className="grid gap-2 sm:grid-cols-4 items-center"
                                  >
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                      {size}
                                    </p>
                                    <input
                                      value={editingProductSizeGuide[size]?.widthCm ?? ''}
                                      onChange={(event) =>
                                        handleGuideChange(size, 'widthCm', event.target.value)
                                      }
                                      placeholder="Largura"
                                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                                    />
                                    <input
                                      value={editingProductSizeGuide[size]?.lengthCm ?? ''}
                                      onChange={(event) =>
                                        handleGuideChange(size, 'lengthCm', event.target.value)
                                      }
                                      placeholder="Comprimento"
                                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                                    />
                                    <input
                                      value={editingProductSizeGuide[size]?.sleeveCm ?? ''}
                                      onChange={(event) =>
                                        handleGuideChange(size, 'sleeveCm', event.target.value)
                                      }
                                      placeholder="Manga"
                                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleSaveProductEdit(
                                    product.id,
                                    product.sizes,
                                    product.stockBySize
                                  )
                                }
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
                );
              })}

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
                    value={newProduct.basePrice}
                    onChange={(event) =>
                      setNewProduct((prev) => ({ ...prev, basePrice: event.target.value }))
                    }
                    placeholder="Preco base"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <input
                    value={newProduct.discountPercentage}
                    onChange={(event) =>
                      setNewProduct((prev) => ({
                        ...prev,
                        discountPercentage: event.target.value,
                      }))
                    }
                    placeholder="Desconto (%)"
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
              onClick={() => {
                void refreshOrders();
              }}
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar pedidos
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {orderMessage && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{orderMessage}</p>
            )}

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
                      void (async () => {
                        try {
                          await updateLocalOrderStatus(order.id, nextStatus);
                          await refreshOrders();
                          setOrderMessage('Status do pedido atualizado.');
                        } catch {
                          setOrderMessage('Nao foi possivel atualizar o status no banco.');
                        }
                      })();
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
                      void (async () => {
                        try {
                          await removeLocalOrder(order.id);
                          await refreshOrders();
                          setOrderMessage('Pedido removido com sucesso.');
                        } catch {
                          setOrderMessage('Nao foi possivel remover o pedido no banco.');
                        }
                      })();
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

      {activeTab === 'settings' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Contato principal
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Esses dados aparecem no rodape da loja.
            </p>

            <form onSubmit={handleSaveStoreSettings} className="mt-4 space-y-3">
              <input
                value={contactDraft.whatsappLabel}
                onChange={(event) =>
                  handleContactDraftChange('whatsappLabel', event.target.value)
                }
                placeholder="WhatsApp exibido (ex.: (81) 98896-6556)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
              />
              <input
                value={contactDraft.whatsappUrl}
                onChange={(event) =>
                  handleContactDraftChange('whatsappUrl', event.target.value)
                }
                placeholder="URL do WhatsApp (ex.: https://wa.me/5581988966556)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
              />
              <input
                value={contactDraft.email}
                onChange={(event) => handleContactDraftChange('email', event.target.value)}
                placeholder="E-mail de contato"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
              />
              <input
                value={contactDraft.handle}
                onChange={(event) => handleContactDraftChange('handle', event.target.value)}
                placeholder="Perfil exibido (ex.: @nuvleoficial)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
              />

              {settingsMessage && (
                <p className="text-sm text-slate-600 dark:text-slate-300">{settingsMessage}</p>
              )}

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold transition-colors"
              >
                Salvar contato e redes
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Links sociais
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Preencha as URLs para habilitar os botoes na secao de contato.
            </p>

            <div className="mt-4 space-y-3">
              {socialPlatforms.map((platform) => (
                <label key={platform.id} className="block">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {platform.label}
                  </span>
                  <input
                    value={socialDraft[platform.id]}
                    onChange={(event) =>
                      handleSocialDraftChange(platform.id, event.target.value)
                    }
                    placeholder={`URL ${platform.label}`}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Pre-visualizacao
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {socialPlatforms.map((platform) => {
                  const hasUrl = socialDraft[platform.id].trim().length > 0;

                  return (
                    <span
                      key={`preview-${platform.id}`}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        hasUrl
                          ? 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {platform.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </article>
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
