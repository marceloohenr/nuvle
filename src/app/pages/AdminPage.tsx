import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCircle2,
  X,
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
import { isSupabaseConfigured } from '../../shared/lib/supabase';
import { uploadProductImages } from '../../shared/lib/storage';

type AdminTab = 'products' | 'orders' | 'customers' | 'settings';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const uniqueValues = (values: string[]) => {
  const unique: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    unique.push(trimmed);
  });

  return unique;
};

const parseImageUrls = (value: string) => uniqueValues(value.split(/[\n,]+/));

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const parseNumericInput = (value: string) => Number(value.replace(',', '.'));

const clampDiscountPercentage = (value: number) => Math.min(95, Math.max(0, value));

const resolveFinalPriceFromDiscount = (basePrice: number, discountPercentage: number) => {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  const safeDiscount = clampDiscountPercentage(discountPercentage);
  return roundCurrency(basePrice * (1 - safeDiscount / 100));
};

const resolveDiscountFromFinalPrice = (basePrice: number, finalPrice: number) => {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) return 0;

  if (finalPrice >= basePrice) return 0;
  return clampDiscountPercentage(roundCurrency((1 - finalPrice / basePrice) * 100));
};

const statusOptions: OrderStatus[] = [
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
];

const socialPlatforms: Array<{ id: SocialPlatform; label: string; Icon: typeof Instagram }> = [
  { id: 'tiktok', label: 'TikTok', Icon: Music2 },
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
  { id: 'x', label: 'X', Icon: X },
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { id: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
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
  const [showSocialIconsDraft, setShowSocialIconsDraft] = useState(settings.showSocialIcons);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');
  const [editingProductBasePrice, setEditingProductBasePrice] = useState('');
  const [editingProductDiscount, setEditingProductDiscount] = useState('');
  const [editingProductFinalPrice, setEditingProductFinalPrice] = useState('');
  const [editingProductPricingMode, setEditingProductPricingMode] = useState<
    'discount' | 'final'
  >('discount');
  const [editingProductImagesText, setEditingProductImagesText] = useState('');
  const [editingProductFiles, setEditingProductFiles] = useState<File[]>([]);
  const [editingProductFileInputKey, setEditingProductFileInputKey] = useState(0);
  const [editingProductSizeGuide, setEditingProductSizeGuide] = useState<
    Record<string, { widthCm: string; lengthCm: string; sleeveCm: string }>
  >({});
  const [newProduct, setNewProduct] = useState({
    name: '',
    imageUrls: '',
    category: '',
    basePrice: '',
    discountPercentage: '',
    finalPrice: '',
    stock: '20',
    sizes: 'P,M,G,GG',
    description: '',
  });
  const [newProductPricingMode, setNewProductPricingMode] = useState<'discount' | 'final'>(
    'discount'
  );
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductFileInputKey, setNewProductFileInputKey] = useState(0);

  const refreshOrders = async () => {
    setOrders(await getLocalOrders());
  };

  useEffect(() => {
    void refreshOrders();
  }, []);

  useEffect(() => {
    setContactDraft(settings.contact);
    setSocialDraft(settings.socialLinks);
    setShowSocialIconsDraft(settings.showSocialIcons);
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

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await addCategory(newCategoryName);

    if (!result.success) {
      setCategoryMessage(result.error ?? 'Nao foi possivel criar a categoria.');
      return;
    }

    setCategoryMessage(`Categoria "${result.category?.label}" criada com sucesso.`);
    setNewCategoryName('');
  };

  const handleRemoveCategory = async (categoryId: string) => {
    const label = getCategoryLabel(categoryId);
    const result = await removeCategory(categoryId);

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
      [field]: field === 'handle' ? value.replace(/^@+/, '') : value,
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
      handle: contactDraft.handle.trim().replace(/^@+/, ''),
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
      setSettingsMessage('Informe um identificador de perfil valido (ex.: nuvleoficial).');
      return;
    }

    setSettings({
      contact: sanitizedContact,
      socialLinks: sanitizedSocial,
      showSocialIcons: showSocialIconsDraft,
    });

    setSettingsMessage('Configuracoes de contato atualizadas com sucesso.');
  };

  const handleCreateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const basePrice = parseNumericInput(newProduct.basePrice);
    const discountPercentage = parseNumericInput(newProduct.discountPercentage || '0');
    const finalPrice = parseNumericInput(newProduct.finalPrice || '0');
    const normalizedSizes = newProduct.sizes
      .split(',')
      .map((size) => size.trim().toUpperCase())
      .filter(Boolean);
    const manualUrls = parseImageUrls(newProduct.imageUrls);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setFormMessage('Informe um preco base valido.');
      return;
    }

    const wantsFinalPrice = newProductPricingMode === 'final';
    const rawDiscountFromFinal = wantsFinalPrice
      ? roundCurrency((1 - finalPrice / basePrice) * 100)
      : 0;

    if (wantsFinalPrice) {
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        setFormMessage('Informe um preco final valido.');
        return;
      }

      if (finalPrice > basePrice) {
        setFormMessage('O preco final deve ser menor ou igual ao preco base.');
        return;
      }

      if (rawDiscountFromFinal > 95) {
        setFormMessage('O desconto maximo permitido e 95%. Ajuste o preco final.');
        return;
      }
    } else {
      if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 95) {
        setFormMessage('O desconto precisa estar entre 0% e 95%.');
        return;
      }
    }

    if (normalizedSizes.length === 0) {
      setFormMessage('Informe ao menos um tamanho para o produto.');
      return;
    }

    const uploadFolder = `draft-${slugify(newProduct.name) || 'produto'}-${Date.now()}`;
    const uploadResult = newProductFiles.length
      ? await uploadProductImages({ productId: uploadFolder, files: newProductFiles })
      : { urls: [], errors: [] };

    const images = uniqueValues([...manualUrls, ...uploadResult.urls]);

    if (images.length === 0) {
      setFormMessage(
        uploadResult.errors.length > 0
          ? `Nao foi possivel enviar imagens: ${uploadResult.errors[0]}`
          : 'Informe ao menos uma imagem (URL ou upload).'
      );
      return;
    }

    const result = await addProduct({
      name: newProduct.name,
      image: images[0],
      images,
      category: newProduct.category,
      price: wantsFinalPrice ? finalPrice : basePrice,
      originalPrice: basePrice,
      discountPercentage: wantsFinalPrice ? undefined : discountPercentage,
      stock: Number(newProduct.stock),
      description: newProduct.description,
      sizes: normalizedSizes,
    });

    if (!result.success) {
      setFormMessage(result.error ?? 'Nao foi possivel adicionar o produto.');
      return;
    }

    if (uploadResult.errors.length > 0) {
      setFormMessage(
        `Produto cadastrado. Algumas imagens falharam no upload: ${uploadResult.errors[0]}`
      );
    } else {
      setFormMessage('Produto cadastrado com sucesso.');
    }
    setNewProduct((prev) => ({
      ...prev,
      name: '',
      imageUrls: '',
      basePrice: '',
      discountPercentage: '',
      finalPrice: '',
      description: '',
      stock: '20',
      sizes: 'P,M,G,GG',
    }));
    setNewProductFiles([]);
    setNewProductFileInputKey((previous) => previous + 1);
    setNewProductPricingMode('discount');
  };

  const startEditingProduct = (
    product: {
      id: string;
      name: string;
      description?: string;
      originalPrice?: number;
      price: number;
      discountPercentage?: number;
      image: string;
      images?: string[];
      sizeGuide?: Array<{ size: string; widthCm: number; lengthCm: number; sleeveCm: number }>;
      sizes?: string[];
    }
  ) => {
    setEditingProductId(product.id);
    setEditingProductName(product.name);
    setEditingProductDescription(product.description ?? '');
    setEditingProductBasePrice(String(product.originalPrice ?? product.price));
    setEditingProductDiscount(String(product.discountPercentage ?? 0));
    setEditingProductFinalPrice(String(product.price));
    setEditingProductPricingMode('discount');
    setEditingProductImagesText(
      uniqueValues(product.images?.length ? product.images : [product.image]).join('\n')
    );
    setEditingProductFiles([]);
    setEditingProductFileInputKey((previous) => previous + 1);
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
    setEditingProductFinalPrice('');
    setEditingProductPricingMode('discount');
    setEditingProductImagesText('');
    setEditingProductFiles([]);
    setEditingProductFileInputKey((previous) => previous + 1);
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

  const handleSaveProductEdit = async (
    productId: string,
    sizes: string[] | undefined,
    stockBySize: Record<string, number> | undefined
  ) => {
    const nextName = editingProductName.trim();
    const nextDescription = editingProductDescription.trim();
    const basePrice = parseNumericInput(editingProductBasePrice);
    const discountPercentage = parseNumericInput(editingProductDiscount || '0');
    const finalPrice = parseNumericInput(editingProductFinalPrice || '0');
    const sizeList = sizes?.length ? sizes : ['UN'];
    const manualUrls = parseImageUrls(editingProductImagesText);

    if (nextName.length < 3) {
      setProductEditMessage('Nome do produto precisa ter ao menos 3 caracteres.');
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setProductEditMessage('Preco base precisa ser maior que zero.');
      return;
    }

    const wantsFinalPrice = editingProductPricingMode === 'final';
    const rawDiscountFromFinal = wantsFinalPrice
      ? roundCurrency((1 - finalPrice / basePrice) * 100)
      : 0;

    if (wantsFinalPrice) {
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        setProductEditMessage('Preco final precisa ser maior que zero.');
        return;
      }

      if (finalPrice > basePrice) {
        setProductEditMessage('Preco final deve ser menor ou igual ao preco base.');
        return;
      }

      if (rawDiscountFromFinal > 95) {
        setProductEditMessage('O desconto maximo permitido e 95%. Ajuste o preco final.');
        return;
      }
    } else {
      if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 95) {
        setProductEditMessage('Desconto deve estar entre 0% e 95%.');
        return;
      }
    }

    const nextGuide = sizeList.map((size) => ({
      size,
      widthCm: Number(editingProductSizeGuide[size]?.widthCm || 0),
      lengthCm: Number(editingProductSizeGuide[size]?.lengthCm || 0),
      sleeveCm: Number(editingProductSizeGuide[size]?.sleeveCm || 0),
    }));

    const uploadResult = editingProductFiles.length
      ? await uploadProductImages({ productId, files: editingProductFiles })
      : { urls: [], errors: [] };

    const images = uniqueValues([...manualUrls, ...uploadResult.urls]);

    if (images.length === 0) {
      setProductEditMessage(
        uploadResult.errors.length > 0
          ? `Nao foi possivel enviar imagens: ${uploadResult.errors[0]}`
          : 'Informe ao menos uma imagem (URL ou upload).'
      );
      return;
    }

    const updated = await updateProduct(productId, {
      name: nextName,
      description: nextDescription,
      image: images[0],
      images,
      price: wantsFinalPrice ? finalPrice : basePrice,
      originalPrice: basePrice,
      discountPercentage: wantsFinalPrice ? 0 : discountPercentage,
      sizeGuide: nextGuide,
      stockBySize,
    });

    if (!updated) {
      setProductEditMessage('Nao foi possivel atualizar este produto.');
      return;
    }

    if (uploadResult.errors.length > 0) {
      setProductEditMessage(
        `Produto atualizado. Algumas imagens falharam no upload: ${uploadResult.errors[0]}`
      );
    } else {
      setProductEditMessage('Produto atualizado com sucesso.');
    }
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
                        src={product.images?.[0] ?? product.image}
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
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditingProductBasePrice(value);

                                  const base = parseNumericInput(value);
                                  if (!Number.isFinite(base) || base <= 0) return;

                                  if (editingProductPricingMode === 'final') {
                                    const final = parseNumericInput(editingProductFinalPrice || '0');
                                    if (Number.isFinite(final) && final > 0) {
                                      setEditingProductDiscount(
                                        String(resolveDiscountFromFinalPrice(base, final))
                                      );
                                    }
                                    return;
                                  }

                                  const discount = parseNumericInput(editingProductDiscount || '0');
                                  if (Number.isFinite(discount) && discount >= 0) {
                                    setEditingProductFinalPrice(
                                      resolveFinalPriceFromDiscount(base, discount).toFixed(2)
                                    );
                                  }
                                }}
                                placeholder="Preco base"
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                              />
                              <input
                                value={editingProductDiscount}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditingProductPricingMode('discount');
                                  setEditingProductDiscount(value);

                                  const base = parseNumericInput(editingProductBasePrice);
                                  const discount = parseNumericInput(value || '0');

                                  if (Number.isFinite(base) && base > 0 && Number.isFinite(discount) && discount >= 0) {
                                    setEditingProductFinalPrice(
                                      resolveFinalPriceFromDiscount(base, discount).toFixed(2)
                                    );
                                  }
                                }}
                                placeholder="Desconto (%)"
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <input
                              value={editingProductFinalPrice}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEditingProductPricingMode('final');
                                setEditingProductFinalPrice(value);

                                const base = parseNumericInput(editingProductBasePrice);
                                const final = parseNumericInput(value || '0');

                                if (Number.isFinite(base) && base > 0 && Number.isFinite(final) && final > 0) {
                                  setEditingProductDiscount(
                                    String(resolveDiscountFromFinalPrice(base, final))
                                  );
                                }
                              }}
                              placeholder="Preco final"
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                            />

                            {(() => {
                              const base = parseNumericInput(editingProductBasePrice);
                              if (!Number.isFinite(base) || base <= 0) return null;

                              const discount = parseNumericInput(editingProductDiscount || '0');
                              const final = parseNumericInput(editingProductFinalPrice || '0');

                              const resolvedFinal =
                                editingProductPricingMode === 'final' && Number.isFinite(final) && final > 0
                                  ? final
                                  : resolveFinalPriceFromDiscount(base, discount);

                              const resolvedDiscount =
                                editingProductPricingMode === 'final' && Number.isFinite(final) && final > 0
                                  ? resolveDiscountFromFinalPrice(base, final)
                                  : clampDiscountPercentage(discount);

                              return (
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                  Pre-visualizacao: {currencyFormatter.format(resolvedFinal)}{' '}
                                  {resolvedDiscount > 0 ? `| ${resolvedDiscount}% OFF` : ''}
                                </p>
                              );
                            })()}

                            <textarea
                              value={editingProductImagesText}
                              onChange={(event) => setEditingProductImagesText(event.target.value)}
                              placeholder="URLs das imagens (uma por linha)"
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-24"
                            />

                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                Upload de imagens (opcional)
                              </p>
                              <input
                                key={editingProductFileInputKey}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => {
                                  const files = event.target.files ? Array.from(event.target.files) : [];
                                  setEditingProductFiles(files);
                                }}
                                className="mt-2 block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                              />
                              {!isSupabaseConfigured && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  Para enviar imagens direto do painel, conecte o Supabase e crie o bucket
                                  {' product-images'}.
                                </p>
                              )}
                              {editingProductFiles.length > 0 && (
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                  {editingProductFiles.length} arquivo(s) selecionado(s).
                                </p>
                              )}
                            </div>

                            {parseImageUrls(editingProductImagesText).length > 0 && (
                              <div className="grid grid-cols-5 gap-2">
                                {parseImageUrls(editingProductImagesText)
                                  .slice(0, 10)
                                  .map((url) => (
                                    <img
                                      key={`edit-product-preview-${product.id}-${url}`}
                                      src={url}
                                      alt="Preview"
                                      className="h-16 w-full rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                                      loading="lazy"
                                    />
                                  ))}
                              </div>
                            )}

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
                                  void handleSaveProductEdit(
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
                        onClick={() => {
                          void (async () => {
                            const removed = await removeProduct(product.id);
                            if (!removed) {
                              setProductEditMessage('Nao foi possivel remover este produto.');
                            }
                          })();
                        }}
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
                      onClick={() => {
                        void handleRemoveCategory(category.id);
                      }}
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
                <textarea
                  value={newProduct.imageUrls}
                  onChange={(event) =>
                    setNewProduct((prev) => ({ ...prev, imageUrls: event.target.value }))
                  }
                  placeholder="URLs das imagens (uma por linha)"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100 min-h-24"
                />

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Upload de imagens (opcional)
                  </p>
                  <input
                    key={newProductFileInputKey}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      const files = event.target.files ? Array.from(event.target.files) : [];
                      setNewProductFiles(files);
                    }}
                    className="mt-2 block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                  />
                  {!isSupabaseConfigured && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Para enviar imagens direto do painel, conecte o Supabase e crie o bucket
                      {' product-images'}.
                    </p>
                  )}
                  {newProductFiles.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      {newProductFiles.length} arquivo(s) selecionado(s).
                    </p>
                  )}
                </div>

                {parseImageUrls(newProduct.imageUrls).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {parseImageUrls(newProduct.imageUrls)
                      .slice(0, 8)
                      .map((url) => (
                        <img
                          key={`new-product-preview-${url}`}
                          src={url}
                          alt="Preview"
                          className="h-20 w-full rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                          loading="lazy"
                        />
                      ))}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={newProduct.basePrice}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewProduct((previous) => {
                        const next = { ...previous, basePrice: value };
                        const base = parseNumericInput(value);

                        if (!Number.isFinite(base) || base <= 0) return next;

                        if (newProductPricingMode === 'final') {
                          const final = parseNumericInput(next.finalPrice || '0');
                          if (Number.isFinite(final) && final > 0) {
                            next.discountPercentage = String(
                              resolveDiscountFromFinalPrice(base, final)
                            );
                          }
                          return next;
                        }

                        const discount = parseNumericInput(next.discountPercentage || '0');
                        if (Number.isFinite(discount) && discount >= 0) {
                          next.finalPrice = resolveFinalPriceFromDiscount(base, discount).toFixed(2);
                        }

                        return next;
                      });
                    }}
                    placeholder="Preco base"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <input
                    value={newProduct.discountPercentage}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewProductPricingMode('discount');
                      setNewProduct((previous) => {
                        const next = { ...previous, discountPercentage: value };
                        const base = parseNumericInput(next.basePrice);
                        const discount = parseNumericInput(value || '0');

                        if (Number.isFinite(base) && base > 0 && Number.isFinite(discount) && discount >= 0) {
                          next.finalPrice = resolveFinalPriceFromDiscount(base, discount).toFixed(2);
                        }

                        return next;
                      });
                    }}
                    placeholder="Desconto (%)"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <input
                    value={newProduct.finalPrice}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewProductPricingMode('final');
                      setNewProduct((previous) => {
                        const next = { ...previous, finalPrice: value };
                        const base = parseNumericInput(next.basePrice);
                        const final = parseNumericInput(value || '0');

                        if (Number.isFinite(base) && base > 0 && Number.isFinite(final) && final > 0) {
                          next.discountPercentage = String(
                            resolveDiscountFromFinalPrice(base, final)
                          );
                        }

                        return next;
                      });
                    }}
                    placeholder="Preco final"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>

                {(() => {
                  const base = parseNumericInput(newProduct.basePrice);
                  if (!Number.isFinite(base) || base <= 0) return null;

                  const discount = parseNumericInput(newProduct.discountPercentage || '0');
                  const final = parseNumericInput(newProduct.finalPrice || '0');

                  const resolvedFinal =
                    newProductPricingMode === 'final' && Number.isFinite(final) && final > 0
                      ? final
                      : resolveFinalPriceFromDiscount(base, discount);

                  const resolvedDiscount =
                    newProductPricingMode === 'final' && Number.isFinite(final) && final > 0
                      ? resolveDiscountFromFinalPrice(base, final)
                      : clampDiscountPercentage(discount);

                  return (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Pre-visualizacao: {currencyFormatter.format(resolvedFinal)}{' '}
                      {resolvedDiscount > 0 ? `| ${resolvedDiscount}% OFF` : ''}
                    </p>
                  );
                })()}
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
                placeholder="Perfil exibido (ex.: nuvleoficial)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
              />

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Exibir icones de redes no rodape
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Quando desativado, os botoes com icones somem do rodape.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSocialIconsDraft}
                  aria-label="Alternar exibicao dos icones de redes no rodape"
                  onClick={() => setShowSocialIconsDraft((previous) => !previous)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showSocialIconsDraft ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showSocialIconsDraft ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

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
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <platform.Icon size={16} />
                    <span className="sr-only">{platform.label}</span>
                  </span>
                  <input
                    value={socialDraft[platform.id]}
                    onChange={(event) =>
                      handleSocialDraftChange(platform.id, event.target.value)
                    }
                    placeholder="URL"
                    aria-label={`URL ${platform.label}`}
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
                      <platform.Icon size={14} />
                      <span className="sr-only">{platform.label}</span>
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
          {isSupabaseConfigured
            ? 'Ambiente administrativo conectado ao banco'
            : 'Ambiente administrativo local'}
        </p>
        <p className="mt-1">
          {isSupabaseConfigured
            ? 'Alteracoes de catalogo, pedidos e contato sao persistidas no Supabase com controle por perfil admin.'
            : 'Todas as alteracoes ficam salvas no navegador. Ao integrar backend, este painel pode reaproveitar o mesmo layout.'}
        </p>
      </section>
    </div>
  );
};

export default AdminPage;
