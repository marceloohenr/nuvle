import {
  BarChart3,
  ClipboardList,
  Download,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useCatalog } from '../../features/catalog';
import {
  type SocialPlatform,
  useStoreSettings,
} from '../../features/settings';
import { deleteCoupon, fetchCoupons, upsertCoupon } from '../../features/coupons';
import {
  addAdminLog,
  clearAdminLogs,
  getAdminLogs,
  type AdminLogScope,
} from '../../features/adminLogs';
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

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'settings' | 'logs';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const pad2 = (value: number) => String(value).padStart(2, '0');

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * MS_IN_DAY);

const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  if (/[";\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
};

const downloadCsv = (filename: string, csv: string) => {
  if (typeof document === 'undefined') return;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

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

const normalizeSizeToken = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : 'UN';
};

const defaultBulkGuideSizes = ['P', 'M', 'G', 'GG'];

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
  const { currentUser, isAdmin, users, deleteUser, promoteUserToAdmin } = useAuth();
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

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | '365d' | 'all'>('30d');
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productFeaturedFilter, setProductFeaturedFilter] = useState<
    'all' | 'featured' | 'not_featured'
  >('all');
  const [orderMessage, setOrderMessage] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [productEditMessage, setProductEditMessage] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [contactDraft, setContactDraft] = useState(settings.contact);
  const [socialDraft, setSocialDraft] = useState(settings.socialLinks);
  const [contactVisibilityDraft, setContactVisibilityDraft] = useState(
    settings.contactVisibility
  );
  const [socialVisibilityDraft, setSocialVisibilityDraft] = useState(
    settings.socialVisibility
  );
  const [showSocialIconsDraft, setShowSocialIconsDraft] = useState(settings.showSocialIcons);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');
  const [editingProductIsFeatured, setEditingProductIsFeatured] = useState(false);
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
  const [bulkGuideCategoryId, setBulkGuideCategoryId] = useState('');
  const [bulkGuideDraft, setBulkGuideDraft] = useState<
    Record<string, { widthCm: string; lengthCm: string; sleeveCm: string }>
  >({});
  const [bulkGuideMessage, setBulkGuideMessage] = useState('');
  const [isBulkGuideApplying, setIsBulkGuideApplying] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    imageUrls: '',
    category: '',
    basePrice: '',
    discountPercentage: '',
    finalPrice: '',
    isFeatured: false,
    stock: '20',
    sizes: 'P,M,G,GG',
    description: '',
  });
  const [newProductPricingMode, setNewProductPricingMode] = useState<'discount' | 'final'>(
    'discount'
  );
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductFileInputKey, setNewProductFileInputKey] = useState(0);

  const [coupons, setCoupons] = useState<
    Array<{
      code: string;
      description: string;
      discountPercentage: number;
      isActive: boolean;
      createdAt: string;
    }>
  >([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponDraft, setCouponDraft] = useState({
    code: '',
    description: '',
    discountPercentage: '10',
    isActive: true,
  });
  const [editingCouponCode, setEditingCouponCode] = useState<string | null>(null);
  const [adminLogs, setAdminLogs] = useState<
    Array<{
      id: string;
      createdAt: string;
      scope: string;
      action: string;
      description: string;
      actorName?: string;
      actorEmail?: string;
    }>
  >([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsMessage, setLogsMessage] = useState('');

  const refreshOrders = async () => {
    setOrders(await getLocalOrders());
  };

  useEffect(() => {
    void refreshOrders();
  }, []);

  useEffect(() => {
    setContactDraft(settings.contact);
    setSocialDraft(settings.socialLinks);
    setContactVisibilityDraft(settings.contactVisibility);
    setSocialVisibilityDraft(settings.socialVisibility);
    setShowSocialIconsDraft(settings.showSocialIcons);
  }, [settings]);

  const refreshCoupons = async () => {
    setIsCouponsLoading(true);
    setCouponMessage('');

    try {
      const next = await fetchCoupons();
      setCoupons(next);
    } catch {
      setCoupons([]);
    } finally {
      setIsCouponsLoading(false);
    }
  };

  const refreshAdminLogs = async () => {
    setIsLogsLoading(true);
    setLogsMessage('');

    try {
      const next = await getAdminLogs(300);
      setAdminLogs(next);
    } catch {
      setAdminLogs([]);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const registerAdminLog = async (
    scope: AdminLogScope,
    action: string,
    description: string,
    metadata?: Record<string, unknown>
  ) => {
    await addAdminLog({
      scope,
      action,
      description,
      actorId: currentUser?.id,
      actorName: currentUser?.name,
      actorEmail: currentUser?.email,
      metadata,
    });

    if (activeTab === 'logs') {
      await refreshAdminLogs();
    }
  };

  useEffect(() => {
    if (activeTab !== 'settings') return;
    void refreshCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'logs') return;
    void refreshAdminLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  const createBulkGuideDraftByCategory = useCallback((categoryId: string) => {
    const categoryProducts = products.filter((product) => product.category === categoryId);
    const sizeSet = new Set<string>();

    categoryProducts.forEach((product) => {
      const fromSizes = product.sizes?.length
        ? product.sizes.map((size) => normalizeSizeToken(size))
        : [];
      const fromGuide = product.sizeGuide?.length
        ? product.sizeGuide.map((row) => normalizeSizeToken(row.size))
        : [];

      [...fromSizes, ...fromGuide].forEach((size) => sizeSet.add(size));
    });

    if (sizeSet.size === 0) {
      defaultBulkGuideSizes.forEach((size) => sizeSet.add(size));
    }

    const sizes = Array.from(sizeSet);

    const draft = sizes.reduce<
      Record<string, { widthCm: string; lengthCm: string; sleeveCm: string }>
    >((accumulator, size) => {
      const guideRow = categoryProducts
        .map((product) =>
          product.sizeGuide?.find(
            (row) => normalizeSizeToken(row.size) === normalizeSizeToken(size)
          )
        )
        .find((row) => Boolean(row));

      accumulator[size] = {
        widthCm: String(guideRow?.widthCm ?? ''),
        lengthCm: String(guideRow?.lengthCm ?? ''),
        sleeveCm: String(guideRow?.sleeveCm ?? ''),
      };

      return accumulator;
    }, {});

    return draft;
  }, [products]);

  useEffect(() => {
    if (categories.length === 0) {
      setBulkGuideCategoryId('');
      setBulkGuideDraft({});
      return;
    }

    setBulkGuideCategoryId((previous) => {
      if (previous && categories.some((category) => category.id === previous)) {
        return previous;
      }
      return categories[0].id;
    });
  }, [categories]);

  useEffect(() => {
    if (!bulkGuideCategoryId) {
      setBulkGuideDraft({});
      return;
    }

    setBulkGuideDraft(createBulkGuideDraftByCategory(bulkGuideCategoryId));
    setBulkGuideMessage('');
  }, [bulkGuideCategoryId, createBulkGuideDraftByCategory]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    let next = products;

    if (query) {
      next = next.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
      );
    }

    if (productFeaturedFilter === 'featured') {
      next = next.filter((product) => Boolean(product.isFeatured));
    } else if (productFeaturedFilter === 'not_featured') {
      next = next.filter((product) => !product.isFeatured);
    }

    return next;
  }, [productFeaturedFilter, productSearch, products]);

  const featuredProducts = useMemo(
    () => products.filter((product) => Boolean(product.isFeatured)),
    [products]
  );
  const featuredVisible = useMemo(() => featuredProducts.slice(0, 8), [featuredProducts]);
  const featuredOverflow = useMemo(() => featuredProducts.slice(8), [featuredProducts]);

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

  const filteredAdminLogs = useMemo(() => {
    const query = logsSearch.trim().toLowerCase();
    if (!query) return adminLogs;

    return adminLogs.filter(
      (log) =>
        log.scope.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.description.toLowerCase().includes(query) ||
        (log.actorName ?? '').toLowerCase().includes(query) ||
        (log.actorEmail ?? '').toLowerCase().includes(query)
    );
  }, [adminLogs, logsSearch]);

  const categoriesWithCount = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.id).length,
    }));
  }, [categories, products]);

  const bulkGuideSizes = useMemo(() => Object.keys(bulkGuideDraft), [bulkGuideDraft]);
  const bulkGuideCategoryProductCount = useMemo(() => {
    return (
      categoriesWithCount.find((category) => category.id === bulkGuideCategoryId)?.count ?? 0
    );
  }, [bulkGuideCategoryId, categoriesWithCount]);

  const adminUsers = useMemo(() => {
    return users
      .filter((user) => user.role === 'admin')
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [users]);

  const customerRows = useMemo(() => {
    type CustomerRow = {
      userId: string | null;
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
        userId: user.id,
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
          userId: null,
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
    await registerAdminLog(
      'category',
      'create',
      `Categoria criada: ${result.category?.label ?? newCategoryName.trim()}`,
      { categoryId: result.category?.id ?? null }
    );
  };

  const handleRemoveCategory = async (categoryId: string) => {
    const label = getCategoryLabel(categoryId);
    const result = await removeCategory(categoryId);

    if (!result.success) {
      setCategoryMessage(result.error ?? 'Nao foi possivel remover a categoria.');
      return;
    }

    setCategoryMessage(`Categoria "${label}" removida.`);
    await registerAdminLog('category', 'remove', `Categoria removida: ${label}`, {
      categoryId,
      label,
    });
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

    if (contactVisibilityDraft.whatsapp && sanitizedContact.whatsappLabel.length < 6) {
      setSettingsMessage('Informe um telefone WhatsApp valido.');
      return;
    }

    if (contactVisibilityDraft.email) {
      if (
        sanitizedContact.email.length < 5 ||
        !sanitizedContact.email.includes('@') ||
        !sanitizedContact.email.includes('.')
      ) {
        setSettingsMessage('Informe um e-mail valido para contato.');
        return;
      }
    }

    if (contactVisibilityDraft.handle && sanitizedContact.handle.length < 3) {
      setSettingsMessage('Informe um identificador de perfil valido (ex.: nuvleoficial).');
      return;
    }

    setSettings({
      contact: sanitizedContact,
      socialLinks: sanitizedSocial,
      showSocialIcons: showSocialIconsDraft,
      contactVisibility: contactVisibilityDraft,
      socialVisibility: socialVisibilityDraft,
    });

    setSettingsMessage('Configuracoes de contato atualizadas com sucesso.');
    void registerAdminLog(
      'settings',
      'update',
      'Configuracoes de contato e redes foram atualizadas.'
    );
  };

  const handleCouponDraftChange = (
    field: 'code' | 'description' | 'discountPercentage' | 'isActive',
    value: string | boolean
  ) => {
    setCouponDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmitCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCouponMessage('');
    const wasEditing = Boolean(editingCouponCode);
    const normalizedCode = couponDraft.code.trim().toUpperCase();

    const discount = Number(String(couponDraft.discountPercentage).replace(',', '.'));
    const result = await upsertCoupon({
      code: couponDraft.code,
      description: couponDraft.description,
      discountPercentage: discount,
      isActive: couponDraft.isActive,
    });

    if (!result.success) {
      setCouponMessage(result.error ?? 'Nao foi possivel salvar o cupom.');
      return;
    }

    setCouponMessage(editingCouponCode ? 'Cupom atualizado.' : 'Cupom criado.');
    setEditingCouponCode(null);
    setCouponDraft({ code: '', description: '', discountPercentage: '10', isActive: true });
    await refreshCoupons();
    await registerAdminLog(
      'coupon',
      wasEditing ? 'update' : 'create',
      `${wasEditing ? 'Cupom atualizado' : 'Cupom criado'}: ${normalizedCode}`,
      {
        code: normalizedCode,
        discountPercentage: discount,
      }
    );
  };

  const startEditingCoupon = (coupon: {
    code: string;
    description: string;
    discountPercentage: number;
    isActive: boolean;
  }) => {
    setEditingCouponCode(coupon.code);
    setCouponDraft({
      code: coupon.code,
      description: coupon.description,
      discountPercentage: String(coupon.discountPercentage),
      isActive: coupon.isActive,
    });
    setCouponMessage('');
  };

  const cancelEditingCoupon = () => {
    setEditingCouponCode(null);
    setCouponDraft({ code: '', description: '', discountPercentage: '10', isActive: true });
    setCouponMessage('');
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
      isFeatured: newProduct.isFeatured,
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
      isFeatured: false,
      description: '',
      stock: '20',
      sizes: 'P,M,G,GG',
    }));
    setNewProductFiles([]);
    setNewProductFileInputKey((previous) => previous + 1);
    setNewProductPricingMode('discount');
    await registerAdminLog('product', 'create', `Produto criado: ${newProduct.name.trim()}`, {
      productName: newProduct.name.trim(),
      category: newProduct.category,
    });
  };

  const startEditingProduct = (
    product: {
      id: string;
      name: string;
      isFeatured?: boolean;
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
    setEditingProductIsFeatured(Boolean(product.isFeatured));
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
    setEditingProductIsFeatured(false);
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

  const handleBulkGuideDraftChange = (
    size: string,
    field: 'widthCm' | 'lengthCm' | 'sleeveCm',
    value: string
  ) => {
    setBulkGuideDraft((previous) => ({
      ...previous,
      [size]: {
        widthCm: previous[size]?.widthCm ?? '',
        lengthCm: previous[size]?.lengthCm ?? '',
        sleeveCm: previous[size]?.sleeveCm ?? '',
        [field]: value,
      },
    }));
  };

  const handleApplyBulkGuideToCategory = async () => {
    const categoryId = bulkGuideCategoryId.trim();
    if (!categoryId) {
      setBulkGuideMessage('Selecione uma categoria para aplicar as medidas.');
      return;
    }

    const categoryProducts = products.filter((product) => product.category === categoryId);
    if (categoryProducts.length === 0) {
      setBulkGuideMessage('Nao ha produtos nesta categoria.');
      return;
    }

    const toGuideNumber = (value: string | number | undefined) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? value : 0;
      }

      const parsed = parseNumericInput(value ?? '0');
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };

    setIsBulkGuideApplying(true);
    setBulkGuideMessage('');

    let updatedCount = 0;
    const failedProducts: string[] = [];

    for (const product of categoryProducts) {
      const productSizes = product.sizes?.length
        ? product.sizes.map((size) => normalizeSizeToken(size))
        : bulkGuideSizes.length > 0
        ? bulkGuideSizes.map((size) => normalizeSizeToken(size))
        : ['UN'];

      const existingGuideBySize = new Map(
        (product.sizeGuide ?? []).map((row) => [normalizeSizeToken(row.size), row])
      );

      const nextGuide = productSizes.map((size) => {
        const normalizedSize = normalizeSizeToken(size);
        const template = bulkGuideDraft[normalizedSize];
        const existing = existingGuideBySize.get(normalizedSize);

        return {
          size: normalizedSize,
          widthCm: toGuideNumber(template?.widthCm ?? existing?.widthCm),
          lengthCm: toGuideNumber(template?.lengthCm ?? existing?.lengthCm),
          sleeveCm: toGuideNumber(template?.sleeveCm ?? existing?.sleeveCm),
        };
      });

      const updated = await updateProduct(product.id, { sizeGuide: nextGuide });
      if (updated) {
        updatedCount += 1;
      } else {
        failedProducts.push(product.name);
      }
    }

    if (updatedCount > 0) {
      const label = getCategoryLabel(categoryId);
      await registerAdminLog(
        'product',
        'bulk_update_size_guide',
        `Guia de medidas atualizado em lote para categoria: ${label}`,
        { categoryId, updatedCount, failedCount: failedProducts.length }
      );
    }

    if (failedProducts.length === 0) {
      setBulkGuideMessage(
        `Medidas aplicadas com sucesso em ${updatedCount} produto(s) da categoria.`
      );
    } else if (updatedCount === 0) {
      setBulkGuideMessage(
        'Nao foi possivel aplicar as medidas nesta categoria. Tente novamente.'
      );
    } else {
      setBulkGuideMessage(
        `Atualizado em ${updatedCount} produto(s). Falha em ${failedProducts.length}.`
      );
    }

    setIsBulkGuideApplying(false);
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
      isFeatured: editingProductIsFeatured,
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
    await registerAdminLog('product', 'update', `Produto atualizado: ${nextName}`, {
      productId,
      isFeatured: editingProductIsFeatured,
    });
    cancelEditingProduct();
  };

  const handleAdjustProductStockBySize = (
    productId: string,
    productName: string,
    size: string,
    delta: number
  ) => {
    adjustProductStockBySize(productId, size, delta);
    void registerAdminLog(
      'stock',
      delta > 0 ? 'increase' : 'decrease',
      `Estoque ${delta > 0 ? 'aumentado' : 'reduzido'}: ${productName} (tam. ${size})`,
      { productId, size, delta }
    );
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
        <div className="grid gap-2 sm:grid-cols-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Dashboard
          </button>
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
          <button
            onClick={() => setActiveTab('logs')}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Logs admin
          </button>
        </div>
      </section>

      {activeTab === 'dashboard' && (
        <section className="space-y-6">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <BarChart3 size={18} />
                  Dashboard
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Visao geral de usuarios, pedidos e produtos mais vendidos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  value={analyticsRange}
                  onChange={(event) =>
                    setAnalyticsRange(event.target.value as typeof analyticsRange)
                  }
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100"
                  aria-label="Selecionar periodo do relatorio"
                >
                  <option value="7d">Ultimos 7 dias</option>
                  <option value="30d">Ultimos 30 dias</option>
                  <option value="365d">Ultimos 12 meses</option>
                  <option value="all">Todo o periodo</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const since =
                      analyticsRange === '7d'
                        ? daysAgo(7)
                        : analyticsRange === '30d'
                        ? daysAgo(30)
                        : analyticsRange === '365d'
                        ? daysAgo(365)
                        : null;

                    const ordersInRange = since
                      ? orders.filter((order) => new Date(order.createdAt) >= since)
                      : orders;

                    const header = [
                      'order_id',
                      'created_at',
                      'status',
                      'payment_method',
                      'total',
                      'customer_name',
                      'customer_email',
                      'customer_phone',
                      'customer_city',
                      'customer_state',
                      'product_id',
                      'product_name',
                      'quantity',
                      'price',
                      'size',
                    ];

                    const lines = [header.join(';')];

                    ordersInRange.forEach((order) => {
                      order.items.forEach((item) => {
                        lines.push(
                          [
                            order.id,
                            order.createdAt,
                            order.status,
                            order.paymentMethod,
                            order.total,
                            order.customer.name,
                            order.customer.email,
                            order.customer.phone,
                            order.customer.city,
                            order.customer.state,
                            item.id,
                            item.name,
                            item.quantity,
                            item.price,
                            item.size ?? '',
                          ]
                            .map((value) => escapeCsvValue(value))
                            .join(';')
                        );
                      });
                    });

                    const today = toLocalDateKey(new Date());
                    downloadCsv(`relatorio-pedidos-${analyticsRange}-${today}.csv`, lines.join('\r\n'));
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download size={16} />
                  Exportar pedidos CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const since =
                      analyticsRange === '7d'
                        ? daysAgo(7)
                        : analyticsRange === '30d'
                        ? daysAgo(30)
                        : analyticsRange === '365d'
                        ? daysAgo(365)
                        : null;

                    const customers = users.filter((user) => user.role === 'customer');
                    const usersInRange = since
                      ? customers.filter((user) => new Date(user.createdAt) >= since)
                      : customers;

                    const header = ['id', 'name', 'email', 'role', 'created_at'];
                    const lines = [header.join(';')];

                    usersInRange.forEach((user) => {
                      lines.push(
                        [user.id, user.name, user.email, user.role, user.createdAt]
                          .map((value) => escapeCsvValue(value))
                          .join(';')
                      );
                    });

                    const today = toLocalDateKey(new Date());
                    downloadCsv(`relatorio-usuarios-${analyticsRange}-${today}.csv`, lines.join('\r\n'));
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download size={16} />
                  Exportar usuarios CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const since =
                      analyticsRange === '7d'
                        ? daysAgo(7)
                        : analyticsRange === '30d'
                        ? daysAgo(30)
                        : analyticsRange === '365d'
                        ? daysAgo(365)
                        : null;

                    const ordersInRange = since
                      ? orders.filter((order) => new Date(order.createdAt) >= since)
                      : orders;

                    const salesByProduct = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();

                    ordersInRange.forEach((order) => {
                      order.items.forEach((item) => {
                        const existing = salesByProduct.get(item.id);
                        const revenue = item.quantity * item.price;

                        if (!existing) {
                          salesByProduct.set(item.id, {
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            revenue,
                          });
                          return;
                        }

                        existing.quantity += item.quantity;
                        existing.revenue += revenue;
                      });
                    });

                    const header = ['product_id', 'product_name', 'quantity', 'revenue'];
                    const lines = [header.join(';')];

                    Array.from(salesByProduct.values())
                      .sort((a, b) => b.quantity - a.quantity)
                      .forEach((row) => {
                        lines.push(
                          [row.id, row.name, row.quantity, row.revenue]
                            .map((value) => escapeCsvValue(value))
                            .join(';')
                        );
                      });

                    const today = toLocalDateKey(new Date());
                    downloadCsv(
                      `relatorio-top-produtos-${analyticsRange}-${today}.csv`,
                      lines.join('\r\n')
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download size={16} />
                  Exportar top produtos CSV
                </button>
              </div>
            </div>

            {(() => {
              const customerUsers = users.filter((user) => user.role === 'customer');
              const newUsersWeek = customerUsers.filter((user) => new Date(user.createdAt) >= daysAgo(7)).length;
              const newUsersMonth = customerUsers.filter((user) => new Date(user.createdAt) >= daysAgo(30)).length;
              const newUsersYear = customerUsers.filter((user) => new Date(user.createdAt) >= daysAgo(365)).length;

              const ordersWeek = orders.filter((order) => new Date(order.createdAt) >= daysAgo(7)).length;
              const ordersMonth = orders.filter((order) => new Date(order.createdAt) >= daysAgo(30)).length;
              const ordersYear = orders.filter((order) => new Date(order.createdAt) >= daysAgo(365)).length;

              const monthOrders = orders.filter((order) => new Date(order.createdAt) >= daysAgo(30));
              const avgOrdersPerDay = monthOrders.length / 30;
              const avgOrderValue =
                monthOrders.length > 0
                  ? monthOrders.reduce((sum, order) => sum + order.total, 0) / monthOrders.length
                  : 0;

              const topSince =
                analyticsRange === '7d'
                  ? daysAgo(7)
                  : analyticsRange === '30d'
                  ? daysAgo(30)
                  : analyticsRange === '365d'
                  ? daysAgo(365)
                  : null;

              const ordersForTop = topSince
                ? orders.filter((order) => new Date(order.createdAt) >= topSince)
                : orders;

              const salesByProduct = new Map<
                string,
                { id: string; name: string; quantity: number; revenue: number; lastSoldAt: string }
              >();

              ordersForTop.forEach((order) => {
                order.items.forEach((item) => {
                  const existing = salesByProduct.get(item.id);
                  const revenue = item.quantity * item.price;
                  const lastSoldAt = order.createdAt;

                  if (!existing) {
                    salesByProduct.set(item.id, {
                      id: item.id,
                      name: item.name,
                      quantity: item.quantity,
                      revenue,
                      lastSoldAt,
                    });
                    return;
                  }

                  existing.quantity += item.quantity;
                  existing.revenue += revenue;

                  if (new Date(lastSoldAt) > new Date(existing.lastSoldAt)) {
                    existing.lastSoldAt = lastSoldAt;
                  }
                });
              });

              const topProducts = Array.from(salesByProduct.values())
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 8);

              const maxTopQty = Math.max(1, ...topProducts.map((row) => row.quantity));

              return (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-3 md:grid-cols-4">
                    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Novos usuarios (7d)
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                        {newUsersWeek}
                      </p>
                    </article>
                    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Novos usuarios (30d)
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                        {newUsersMonth}
                      </p>
                    </article>
                    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Novos usuarios (12m)
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                        {newUsersYear}
                      </p>
                    </article>
                    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Media pedidos/dia (30d)
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                        {avgOrdersPerDay.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ticket medio: {currencyFormatter.format(avgOrderValue)}
                      </p>
                    </article>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Novos usuarios
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Semana, mes e ano (clientes).
                      </p>
                      <div className="mt-4 space-y-2">
                        {[
                          { label: '7d', value: newUsersWeek },
                          { label: '30d', value: newUsersMonth },
                          { label: '12m', value: newUsersYear },
                        ].map((point) => (
                          <div key={point.label} className="grid grid-cols-[42px_1fr_60px] gap-3 items-center">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {point.label}
                            </span>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{
                                  width: `${(point.value / Math.max(1, newUsersYear)) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-300 text-right">
                              {point.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Pedidos
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Semana, mes e ano.
                      </p>
                      <div className="mt-4 space-y-2">
                        {[
                          { label: '7d', value: ordersWeek },
                          { label: '30d', value: ordersMonth },
                          { label: '12m', value: ordersYear },
                        ].map((point) => (
                          <div key={point.label} className="grid grid-cols-[42px_1fr_60px] gap-3 items-center">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {point.label}
                            </span>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{
                                  width: `${(point.value / Math.max(1, ordersYear)) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-300 text-right">
                              {point.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Camisas mais vendidas
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Top 8 do periodo selecionado.
                      </p>
                      {topProducts.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                          Sem vendas no periodo.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {topProducts.map((row) => (
                            <div key={row.id} className="space-y-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                                  {row.name}
                                </p>
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {row.quantity} un
                                </p>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${(row.quantity / maxTopQty) * 100}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Receita: {currencyFormatter.format(row.revenue)} | Ultima venda:{' '}
                                {dateFormatter.format(new Date(row.lastSoldAt))}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              );
            })()}
          </article>
        </section>
      )}

      {activeTab === 'products' && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Em alta (Home)
                  </p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {featuredProducts.length === 0
                      ? 'Nenhuma camisa marcada como Em alta ainda.'
                      : `${featuredProducts.length} produto(s) marcado(s). A Home mostra ate 8.`}
                  </p>
                  {featuredOverflow.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {featuredOverflow.length} marcado(s) a mais nao aparecem na Home.
                    </p>
                  )}
                </div>
                <Link
                  to="/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-colors"
                >
                  Abrir Home
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { id: 'all' as const, label: `Todos (${products.length})` },
                  { id: 'featured' as const, label: `Em alta (${featuredProducts.length})` },
                  {
                    id: 'not_featured' as const,
                    label: `Nao em alta (${Math.max(0, products.length - featuredProducts.length)})`,
                  },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setProductFeaturedFilter(option.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      productFeaturedFilter === option.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {featuredVisible.length > 0 && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Aparecendo na Home agora
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {featuredVisible.map((product) => (
                      <div
                        key={`featured-preview-${product.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                      >
                        <img
                          src={product.images?.[0] ?? product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded-xl object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getCategoryLabel(product.category)} ·{' '}
                            {currencyFormatter.format(product.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              const ok = await updateProduct(product.id, {
                                isFeatured: false,
                              });
                              if (!ok) {
                                setProductEditMessage(
                                  'Nao foi possivel remover o produto de Em alta.'
                                );
                                return;
                              }
                              await registerAdminLog(
                                'product',
                                'featured_off',
                                `Produto removido de Em alta: ${product.name}`,
                                { productId: product.id }
                              );
                            })();
                          }}
                          className="rounded-xl border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        >
                          Remover
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingProduct(product)}
                          className="rounded-xl border border-blue-200 dark:border-blue-900 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                          {product.isFeatured ? ' | Em alta' : ''}
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
                                    onClick={() =>
                                      handleAdjustProductStockBySize(
                                        product.id,
                                        product.name,
                                        size,
                                        -1
                                      )
                                    }
                                    className="h-5 w-5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                  >
                                    -
                                  </button>
                                  <span className="min-w-5 text-center text-slate-700 dark:text-slate-200">
                                    {currentStock}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleAdjustProductStockBySize(
                                        product.id,
                                        product.name,
                                        size,
                                        1
                                      )
                                    }
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
                            type="button"
                            onClick={() => {
                              void (async () => {
                                const ok = await updateProduct(product.id, {
                                  isFeatured: !product.isFeatured,
                                });
                                if (!ok) {
                                  setProductEditMessage(
                                    'Nao foi possivel atualizar a exibicao do produto em Em alta.'
                                  );
                                  return;
                                }
                                await registerAdminLog(
                                  'product',
                                  product.isFeatured ? 'featured_off' : 'featured_on',
                                  `Produto ${product.isFeatured ? 'removido de' : 'marcado como'} Em alta: ${product.name}`,
                                  { productId: product.id }
                                );
                              })();
                            }}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                              product.isFeatured
                                ? 'border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/70'
                            }`}
                          >
                            {product.isFeatured ? 'Remover Em alta' : 'Marcar Em alta'}
                          </button>
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

                            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-4 py-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                  Em alta (Home)
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                  Ative para o produto aparecer na secao "Em alta" da pagina inicial.
                                </p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={editingProductIsFeatured}
                                aria-label="Marcar produto como Em alta"
                                onClick={() => setEditingProductIsFeatured((previous) => !previous)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  editingProductIsFeatured
                                    ? 'bg-blue-600'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    editingProductIsFeatured ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

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
                              return;
                            }
                            await registerAdminLog(
                              'product',
                              'remove',
                              `Produto removido: ${product.name}`,
                              { productId: product.id }
                            );
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
                Medidas por categoria
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Altere uma vez e aplique em todos os produtos da categoria.
              </p>

              <div className="mt-3 space-y-3">
                <select
                  value={bulkGuideCategoryId}
                  onChange={(event) => setBulkGuideCategoryId(event.target.value)}
                  disabled={categories.length === 0}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                >
                  {categories.length === 0 ? (
                    <option value="">Cadastre uma categoria primeiro</option>
                  ) : (
                    categories.map((category) => (
                      <option key={`bulk-guide-${category.id}`} value={category.id}>
                        {category.label}
                      </option>
                    ))
                  )}
                </select>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {bulkGuideCategoryProductCount} produto(s) nesta categoria.
                </p>

                {bulkGuideSizes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">
                    Nenhum tamanho encontrado para esta categoria.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {bulkGuideSizes.map((size) => (
                      <div
                        key={`bulk-guide-row-${size}`}
                        className="grid gap-2 grid-cols-4 items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2"
                      >
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {size}
                        </p>
                        <input
                          value={bulkGuideDraft[size]?.widthCm ?? ''}
                          onChange={(event) =>
                            handleBulkGuideDraftChange(size, 'widthCm', event.target.value)
                          }
                          placeholder="Largura"
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                        />
                        <input
                          value={bulkGuideDraft[size]?.lengthCm ?? ''}
                          onChange={(event) =>
                            handleBulkGuideDraftChange(size, 'lengthCm', event.target.value)
                          }
                          placeholder="Comprimento"
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                        />
                        <input
                          value={bulkGuideDraft[size]?.sleeveCm ?? ''}
                          onChange={(event) =>
                            handleBulkGuideDraftChange(size, 'sleeveCm', event.target.value)
                          }
                          placeholder="Manga"
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    isBulkGuideApplying ||
                    !bulkGuideCategoryId ||
                    bulkGuideCategoryProductCount === 0 ||
                    bulkGuideSizes.length === 0
                  }
                  onClick={() => {
                    void handleApplyBulkGuideToCategory();
                  }}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:text-slate-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {isBulkGuideApplying
                    ? 'Aplicando medidas...'
                    : 'Aplicar medidas em toda categoria'}
                </button>

                {bulkGuideMessage && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {bulkGuideMessage}
                  </p>
                )}
              </div>
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

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Em alta (Home)
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Quando ativado, este produto aparece na secao "Em alta" da pagina inicial.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={newProduct.isFeatured}
                    aria-label="Marcar produto como Em alta"
                    onClick={() =>
                      setNewProduct((previous) => ({
                        ...previous,
                        isFeatured: !previous.isFeatured,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newProduct.isFeatured ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newProduct.isFeatured ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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
                          await registerAdminLog(
                            'order',
                            'status_update',
                            `Status do pedido ${order.id} atualizado para ${orderStatusLabel[nextStatus]}.`,
                            {
                              orderId: order.id,
                              status: nextStatus,
                            }
                          );
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
                          await registerAdminLog(
                            'order',
                            'remove',
                            `Pedido removido: ${order.id}`,
                            { orderId: order.id }
                          );
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
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Usuarios admin</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Contas com permissao de gerenciamento total da loja.
          </p>

          <div className="mt-4 space-y-3">
            {adminUsers.map((adminUser) => (
              <article
                key={adminUser.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 grid place-items-center">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {adminUser.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {adminUser.email}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    Admin
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Cadastro: {dateFormatter.format(new Date(adminUser.createdAt))}
                </p>
              </article>
            ))}

            {adminUsers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum usuario admin encontrado.
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Base de clientes
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Dados unificados dos cadastros e dos pedidos ja realizados.
            </p>

            {customerMessage && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {customerMessage}
              </p>
            )}

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
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {customer.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {customer.email}
                        </p>
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
                      {customer.userId ? (
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void (async () => {
                                if (
                                  typeof window !== 'undefined' &&
                                  !window.confirm(
                                    `Deseja tornar ${customer.name} (${customer.email}) admin?`
                                  )
                                ) {
                                  return;
                                }

                                const result = await promoteUserToAdmin(customer.userId);
                                if (!result.success) {
                                  setCustomerMessage(
                                    result.error ?? 'Nao foi possivel promover este usuario.'
                                  );
                                  return;
                                }

                                setCustomerMessage('Usuario promovido para admin com sucesso.');
                                await refreshOrders();
                                await registerAdminLog(
                                  'system',
                                  'promote_user_admin',
                                  `Usuario promovido para admin: ${customer.name} (${customer.email})`,
                                  {
                                    userId: customer.userId,
                                    email: customer.email,
                                  }
                                );
                              })();
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            Tornar admin
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void (async () => {
                                if (
                                  typeof window !== 'undefined' &&
                                  !window.confirm(
                                    `Deseja apagar o usuario ${customer.name} (${customer.email})?`
                                  )
                                ) {
                                  return;
                                }

                                const result = await deleteUser(customer.userId);
                                if (!result.success) {
                                  setCustomerMessage(
                                    result.error ?? 'Nao foi possivel apagar este usuario.'
                                  );
                                  return;
                                }

                                setCustomerMessage('Usuario apagado com sucesso.');
                                await refreshOrders();
                                await registerAdminLog(
                                  'system',
                                  'delete_user',
                                  `Usuario apagado: ${customer.name} (${customer.email})`,
                                  {
                                    userId: customer.userId,
                                    email: customer.email,
                                  }
                                );
                              })();
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            Apagar usuario
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                          Sem conta para apagar
                        </p>
                      )}
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

            <form onSubmit={handleSaveStoreSettings} className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      WhatsApp no rodape
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Exibir o telefone e o link do WhatsApp na secao de contato.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={contactVisibilityDraft.whatsapp}
                    aria-label="Exibir WhatsApp no rodape"
                    onClick={() =>
                      setContactVisibilityDraft((previous) => ({
                        ...previous,
                        whatsapp: !previous.whatsapp,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      contactVisibilityDraft.whatsapp
                        ? 'bg-blue-600'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        contactVisibilityDraft.whatsapp ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      E-mail no rodape
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Exibir o e-mail na secao de contato.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={contactVisibilityDraft.email}
                    aria-label="Exibir e-mail no rodape"
                    onClick={() =>
                      setContactVisibilityDraft((previous) => ({
                        ...previous,
                        email: !previous.email,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      contactVisibilityDraft.email
                        ? 'bg-blue-600'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        contactVisibilityDraft.email ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <input
                  value={contactDraft.email}
                  onChange={(event) => handleContactDraftChange('email', event.target.value)}
                  placeholder="E-mail de contato"
                  className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Perfil no rodape
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Exibir o usuario (sem @) no rodape.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={contactVisibilityDraft.handle}
                    aria-label="Exibir perfil no rodape"
                    onClick={() =>
                      setContactVisibilityDraft((previous) => ({
                        ...previous,
                        handle: !previous.handle,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      contactVisibilityDraft.handle
                        ? 'bg-blue-600'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        contactVisibilityDraft.handle ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <input
                  value={contactDraft.handle}
                  onChange={(event) => handleContactDraftChange('handle', event.target.value)}
                  placeholder="Perfil exibido (ex.: nuvleoficial)"
                  className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
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
              Ative/desative cada canal e informe a URL que sera usada nos botoes do rodape.
            </p>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Exibir icones no rodape
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Desative para esconder todos os botoes de redes sociais.
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

            <div className="mt-4 space-y-3">
              {socialPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <platform.Icon size={16} />
                      <span className="sr-only">{platform.label}</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={socialVisibilityDraft[platform.id]}
                      aria-label={`Exibir ${platform.label} no rodape`}
                      onClick={() =>
                        setSocialVisibilityDraft((previous) => ({
                          ...previous,
                          [platform.id]: !previous[platform.id],
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        socialVisibilityDraft[platform.id]
                          ? 'bg-blue-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          socialVisibilityDraft[platform.id] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <input
                    value={socialDraft[platform.id]}
                    onChange={(event) =>
                      handleSocialDraftChange(platform.id, event.target.value)
                    }
                    placeholder="URL"
                    aria-label={`URL ${platform.label}`}
                    className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Pre-visualizacao
              </p>
              {!showSocialIconsDraft ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Icones ocultos no rodape.
                </p>
              ) : (() => {
                const enabled = socialPlatforms.filter(
                  (platform) => socialVisibilityDraft[platform.id]
                );

                if (enabled.length === 0) {
                  return (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Nenhum icone ativo.
                    </p>
                  );
                }

                return (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {enabled.map((platform) => {
                      const hasUrl = socialDraft[platform.id].trim().length > 0;

                      return (
                        <span
                          key={`preview-${platform.id}`}
                          title={platform.label}
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
                );
              })()}
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Para aplicar, clique em "Salvar contato e redes".
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Cupons de desconto
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Crie cupons como <strong>NUVLE10</strong> para o cliente digitar no checkout e ganhar
              desconto no total.
            </p>

            <form onSubmit={handleSubmitCoupon} className="mt-4 grid gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Codigo
                </label>
                <input
                  value={couponDraft.code}
                  onChange={(event) => handleCouponDraftChange('code', event.target.value)}
                  placeholder="NUVLE10"
                  disabled={Boolean(editingCouponCode)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100 disabled:opacity-60"
                />
                {editingCouponCode && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Para trocar o codigo, crie outro cupom.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Desconto (%)
                </label>
                <input
                  value={couponDraft.discountPercentage}
                  onChange={(event) =>
                    handleCouponDraftChange('discountPercentage', event.target.value)
                  }
                  placeholder="10"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Descricao
                </label>
                <input
                  value={couponDraft.description}
                  onChange={(event) => handleCouponDraftChange('description', event.target.value)}
                  placeholder="10% de desconto na primeira compra"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={couponDraft.isActive}
                  aria-label="Alternar cupom ativo"
                  onClick={() => handleCouponDraftChange('isActive', !couponDraft.isActive)}
                  className={`relative inline-flex h-11 w-16 items-center rounded-full transition-colors ${
                    couponDraft.isActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-7 w-7 transform rounded-full bg-white transition-transform ${
                      couponDraft.isActive ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-semibold transition-colors"
                >
                  {editingCouponCode ? 'Salvar' : 'Criar'}
                </button>
              </div>

              {editingCouponCode && (
                <div className="md:col-span-12">
                  <button
                    type="button"
                    onClick={cancelEditingCoupon}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar edicao
                  </button>
                </div>
              )}
            </form>

            {couponMessage && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{couponMessage}</p>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Cupons cadastrados
                </h3>
                <button
                  type="button"
                  onClick={() => void refreshCoupons()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw size={16} />
                  Atualizar
                </button>
              </div>

              {isCouponsLoading ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
              ) : coupons.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhum cupom cadastrado ainda.
                </div>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.code}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {coupon.code} (-{coupon.discountPercentage}%)
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {coupon.isActive ? 'Ativo' : 'Desativado'}
                            {' · '}
                            {coupon.description || 'Sem descricao'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            coupon.isActive
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {coupon.isActive ? 'Ativo' : 'Off'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingCoupon(coupon)}
                          className="rounded-xl border border-blue-200 dark:border-blue-900 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              setCouponMessage('');
                              const result = await upsertCoupon({
                                code: coupon.code,
                                description: coupon.description,
                                discountPercentage: coupon.discountPercentage,
                                isActive: !coupon.isActive,
                              });
                              if (!result.success) {
                                setCouponMessage(result.error ?? 'Nao foi possivel atualizar o cupom.');
                                return;
                              }
                              await refreshCoupons();
                              await registerAdminLog(
                                'coupon',
                                coupon.isActive ? 'deactivate' : 'activate',
                                `Cupom ${coupon.isActive ? 'desativado' : 'ativado'}: ${coupon.code}`,
                                {
                                  code: coupon.code,
                                  isActive: !coupon.isActive,
                                }
                              );
                            })();
                          }}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors"
                        >
                          {coupon.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              setCouponMessage('');
                              if (
                                typeof window !== 'undefined' &&
                                !window.confirm(`Remover o cupom ${coupon.code}?`)
                              ) {
                                return;
                              }
                              const result = await deleteCoupon(coupon.code);
                              if (!result.success) {
                                setCouponMessage(result.error ?? 'Nao foi possivel remover o cupom.');
                                return;
                              }
                              await refreshCoupons();
                              await registerAdminLog(
                                'coupon',
                                'remove',
                                `Cupom removido: ${coupon.code}`,
                                { code: coupon.code }
                              );
                            })();
                          }}
                          className="rounded-xl border border-red-200 dark:border-red-900 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'logs' && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                <ClipboardList size={18} />
                Log administrativo
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Historico das acoes realizadas no painel admin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void refreshAdminLogs();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw size={15} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    if (
                      typeof window !== 'undefined' &&
                      !window.confirm('Deseja limpar todos os logs administrativos?')
                    ) {
                      return;
                    }

                    await clearAdminLogs();
                    setLogsMessage('Logs limpos com sucesso.');
                    await refreshAdminLogs();
                  })();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={14} />
                Limpar logs
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={logsSearch}
              onChange={(event) => setLogsSearch(event.target.value)}
              placeholder="Buscar por acao, descricao ou usuario"
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {logsMessage && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{logsMessage}</p>
          )}

          <div className="mt-4 space-y-3 max-h-[760px] overflow-y-auto pr-1">
            {isLogsLoading ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Carregando logs...
              </div>
            ) : filteredAdminLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum log encontrado.
              </div>
            ) : (
              filteredAdminLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest">
                        {log.scope}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {log.action}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {dateFormatter.format(new Date(log.createdAt))}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {log.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {log.actorName || log.actorEmail
                      ? `Por: ${log.actorName ?? '-'} (${log.actorEmail ?? '-'})`
                      : 'Origem: painel administrativo'}
                  </p>
                </article>
              ))
            )}
          </div>
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
