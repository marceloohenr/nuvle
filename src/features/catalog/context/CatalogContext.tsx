/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase';
import { products as seedProducts } from '../data/products';
import type {
  Product,
  ProductCategory,
  ProductCategoryMeta,
  SizeGuideRow,
} from '../types/product';

interface ProductDraft {
  name: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  category: ProductCategory;
  description?: string;
  sizes?: string[];
  stock: number;
  stockBySize?: Record<string, number>;
  sizeGuide?: SizeGuideRow[];
}

interface StockItem {
  id: string;
  size?: string;
  quantity: number;
}

interface ConsumeStockIssue {
  productId: string;
  productName: string;
  size?: string;
  requested: number;
  available: number;
}

interface ConsumeStockResult {
  success: boolean;
  issues?: ConsumeStockIssue[];
}

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CategoryActionResult extends ActionResult {
  category?: ProductCategoryMeta;
}

interface CatalogContextValue {
  products: Product[];
  categories: ProductCategoryMeta[];
  addProduct: (product: ProductDraft) => ActionResult;
  updateProduct: (productId: string, updates: Partial<Omit<Product, 'id'>>) => boolean;
  removeProduct: (productId: string) => void;
  adjustProductStock: (productId: string, delta: number) => void;
  adjustProductStockBySize: (productId: string, size: string, delta: number) => void;
  consumeProductStock: (items: StockItem[]) => ConsumeStockResult;
  addCategory: (label: string) => CategoryActionResult;
  removeCategory: (categoryId: string) => CategoryActionResult;
  getCategoryLabel: (categoryId: string) => string;
  getProductSizeStock: (product: Product, size?: string) => number;
  getProductById: (productId: string) => Product | undefined;
}

const CATALOG_STORAGE_KEY = 'nuvle-catalog-v1';
const CATEGORIES_STORAGE_KEY = 'nuvle-categories-v1';
const DEFAULT_STOCK = 20;
const DEFAULT_SIZES = ['P', 'M', 'G', 'GG'];
const DEFAULT_CREATED_AT = '2026-01-01T00:00:00.000Z';
const PRICE_ROUND_FACTOR = 100;

const defaultCategoryLabels: Record<string, string> = {
  basicas: 'Basicas',
  estampadas: 'Estampadas',
  oversized: 'Oversized',
};

const defaultSizeGuideBySize: Record<string, Omit<SizeGuideRow, 'size'>> = {
  P: { widthCm: 53, lengthCm: 71, sleeveCm: 22 },
  M: { widthCm: 56, lengthCm: 73, sleeveCm: 23 },
  G: { widthCm: 59, lengthCm: 75, sleeveCm: 24 },
  GG: { widthCm: 62, lengthCm: 77, sleeveCm: 25 },
};

interface CategoryRow {
  id: string;
  label: string;
  created_at: string;
}

interface ProductSizeRow {
  product_id: string;
  size: string;
  stock: number;
  width_cm: number;
  length_cm: number;
  sleeve_cm: number;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  discount_percentage: number | null;
  image: string;
  category_id: string;
  description: string | null;
  product_sizes?: ProductSizeRow[];
}

const roundCurrency = (value: number) =>
  Math.round(value * PRICE_ROUND_FACTOR) / PRICE_ROUND_FACTOR;

const normalizeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizePositiveInteger = (value: unknown) => {
  const parsed = Math.round(normalizeNumber(value, 0));
  return Math.max(0, parsed);
};

const normalizeSizeToken = (value: unknown) => {
  if (typeof value !== 'string') return 'UN';
  const token = value.trim().toUpperCase();
  return token.length > 0 ? token : 'UN';
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const toReadableCategoryLabel = (categoryId: string) => {
  const fromPreset = defaultCategoryLabels[categoryId];
  if (fromPreset) return fromPreset;

  const text = categoryId
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return text || 'Categoria';
};

const normalizeCategoryId = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return slugify(value);
};

const normalizeSizes = (value: unknown): string[] => {
  if (!Array.isArray(value)) return DEFAULT_SIZES;

  const sizes = value
    .map((entry) => normalizeSizeToken(entry))
    .filter((entry) => entry.length > 0);

  return sizes.length > 0 ? Array.from(new Set(sizes)) : DEFAULT_SIZES;
};

const distributeStockAcrossSizes = (totalStock: number, sizes: string[]) => {
  const safeSizes = sizes.length > 0 ? sizes : ['UN'];
  const normalizedTotal = Math.max(0, Math.round(totalStock));

  if (safeSizes.length === 1) {
    return { [safeSizes[0]]: normalizedTotal };
  }

  const base = Math.floor(normalizedTotal / safeSizes.length);
  const remainder = normalizedTotal % safeSizes.length;

  return safeSizes.reduce<Record<string, number>>((accumulator, size, index) => {
    accumulator[size] = base + (index < remainder ? 1 : 0);
    return accumulator;
  }, {});
};

const sumStockBySize = (stockBySize: Record<string, number>) =>
  Object.values(stockBySize).reduce((sum, value) => sum + normalizePositiveInteger(value), 0);

const normalizeStockBySize = (
  value: unknown,
  sizes: string[],
  fallbackStock: number
): Record<string, number> => {
  const safeSizes = sizes.length > 0 ? sizes : ['UN'];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return distributeStockAcrossSizes(fallbackStock, safeSizes);
  }

  const rawMap = value as Record<string, unknown>;
  const next = safeSizes.reduce<Record<string, number>>((accumulator, size) => {
    const rawValue = rawMap[size];
    accumulator[size] = normalizePositiveInteger(rawValue);
    return accumulator;
  }, {});

  const hasMeaningfulStock = Object.values(next).some((quantity) => quantity > 0);
  if (!hasMeaningfulStock && fallbackStock > 0) {
    return distributeStockAcrossSizes(fallbackStock, safeSizes);
  }

  return next;
};

const getDefaultGuideRow = (size: string): SizeGuideRow => {
  const template = defaultSizeGuideBySize[size] ?? {
    widthCm: 0,
    lengthCm: 0,
    sleeveCm: 0,
  };

  return {
    size,
    widthCm: template.widthCm,
    lengthCm: template.lengthCm,
    sleeveCm: template.sleeveCm,
  };
};

const normalizeGuideNumber = (value: unknown, fallback: number) => {
  const parsed = normalizeNumber(value, fallback);
  if (parsed < 0) return fallback;
  return roundCurrency(parsed);
};

const normalizeSizeGuide = (value: unknown, sizes: string[]): SizeGuideRow[] => {
  const safeSizes = sizes.length > 0 ? sizes : ['UN'];

  if (!Array.isArray(value)) {
    return safeSizes.map((size) => getDefaultGuideRow(size));
  }

  const rowsBySize = new Map<string, SizeGuideRow>();

  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const row = entry as Partial<SizeGuideRow>;
    const size = normalizeSizeToken(row.size);
    const fallback = getDefaultGuideRow(size);

    rowsBySize.set(size, {
      size,
      widthCm: normalizeGuideNumber(row.widthCm, fallback.widthCm),
      lengthCm: normalizeGuideNumber(row.lengthCm, fallback.lengthCm),
      sleeveCm: normalizeGuideNumber(row.sleeveCm, fallback.sleeveCm),
    });
  });

  return safeSizes.map((size) => {
    const row = rowsBySize.get(size);
    return row ?? getDefaultGuideRow(size);
  });
};

const normalizeDiscountPercentage = (value: unknown): number | undefined => {
  const parsed = normalizeNumber(value, NaN);
  if (!Number.isFinite(parsed)) return undefined;

  const clamped = Math.min(95, Math.max(0, parsed));
  return roundCurrency(clamped);
};

const resolvePricing = ({
  price,
  originalPrice,
  discountPercentage,
}: {
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
}): { price: number; originalPrice?: number; discountPercentage?: number } | null => {
  const normalizedPrice = roundCurrency(normalizeNumber(price, 0));
  const normalizedOriginal =
    typeof originalPrice === 'number' && Number.isFinite(originalPrice)
      ? roundCurrency(Math.max(0, originalPrice))
      : undefined;
  const normalizedDiscount = normalizeDiscountPercentage(discountPercentage);

  if (normalizedDiscount !== undefined && normalizedDiscount > 0) {
    const baseOriginal = normalizedOriginal && normalizedOriginal > 0 ? normalizedOriginal : normalizedPrice;
    if (!baseOriginal || baseOriginal <= 0) return null;

    const discountedPrice = roundCurrency(baseOriginal * (1 - normalizedDiscount / 100));

    return {
      price: discountedPrice,
      originalPrice: baseOriginal,
      discountPercentage: normalizedDiscount,
    };
  }

  if (normalizedPrice <= 0) return null;

  const canShowOriginal =
    normalizedOriginal !== undefined && normalizedOriginal > normalizedPrice
      ? normalizedOriginal
      : undefined;

  const derivedDiscount =
    canShowOriginal && canShowOriginal > normalizedPrice
      ? roundCurrency((1 - normalizedPrice / canShowOriginal) * 100)
      : undefined;

  return {
    price: normalizedPrice,
    originalPrice: canShowOriginal,
    discountPercentage: derivedDiscount && derivedDiscount > 0 ? derivedDiscount : undefined,
  };
};

const normalizeCategoryMeta = (value: unknown): ProductCategoryMeta | null => {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<ProductCategoryMeta>;

  const categoryId = normalizeCategoryId(entry.id);
  if (!categoryId) return null;

  const label =
    typeof entry.label === 'string' && entry.label.trim().length > 0
      ? entry.label.trim()
      : toReadableCategoryLabel(categoryId);

  const createdAt =
    typeof entry.createdAt === 'string' && entry.createdAt.trim().length > 0
      ? entry.createdAt
      : DEFAULT_CREATED_AT;

  return {
    id: categoryId,
    label,
    createdAt,
  };
};

const normalizeProduct = (value: unknown): Product | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Product>;

  const categoryId = normalizeCategoryId(item.category);

  if (
    !item.id ||
    !item.name ||
    !item.image ||
    !categoryId ||
    typeof item.id !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.image !== 'string' ||
    typeof item.price !== 'number'
  ) {
    return null;
  }

  const sizes = normalizeSizes(item.sizes);
  const stockBySize = normalizeStockBySize(item.stockBySize, sizes, item.stock ?? DEFAULT_STOCK);
  const totalStock = sumStockBySize(stockBySize);
  const sizeGuide = normalizeSizeGuide(item.sizeGuide, sizes);

  const pricing = resolvePricing({
    price: item.price,
    originalPrice: item.originalPrice,
    discountPercentage: item.discountPercentage,
  });

  if (!pricing) return null;

  return {
    id: item.id,
    name: item.name,
    image: item.image,
    category: categoryId,
    description: typeof item.description === 'string' ? item.description : undefined,
    sizes,
    stockBySize,
    sizeGuide,
    stock: totalStock,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discountPercentage: pricing.discountPercentage,
  };
};

const normalizeProductDraft = (draft: ProductDraft): ProductDraft => {
  const sizes = normalizeSizes(draft.sizes);
  const stockBySize = normalizeStockBySize(draft.stockBySize, sizes, draft.stock);
  const totalStock = sumStockBySize(stockBySize);

  return {
    ...draft,
    name: draft.name.trim(),
    image: draft.image.trim(),
    description: draft.description?.trim(),
    category: normalizeCategoryId(draft.category),
    sizes,
    stockBySize,
    stock: totalStock,
    sizeGuide: normalizeSizeGuide(draft.sizeGuide, sizes),
    price: normalizeNumber(draft.price, 0),
    originalPrice:
      typeof draft.originalPrice === 'number' && Number.isFinite(draft.originalPrice)
        ? draft.originalPrice
        : undefined,
    discountPercentage: normalizeDiscountPercentage(draft.discountPercentage),
  };
};

const categoryRowToMeta = (value: unknown): ProductCategoryMeta | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<CategoryRow>;

  return normalizeCategoryMeta({
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
  });
};

const productRowToProduct = (value: unknown): Product | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<ProductRow>;

  if (
    !row.id ||
    !row.name ||
    !row.image ||
    !row.category_id ||
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.image !== 'string' ||
    typeof row.category_id !== 'string'
  ) {
    return null;
  }

  const sizeRows = Array.isArray(row.product_sizes) ? row.product_sizes : [];
  const sizes = sizeRows.map((entry) => normalizeSizeToken(entry.size));
  const uniqueSizes = sizes.length > 0 ? Array.from(new Set(sizes)) : DEFAULT_SIZES;

  const stockBySize = uniqueSizes.reduce<Record<string, number>>((accumulator, size) => {
    const matching = sizeRows.find((entry) => normalizeSizeToken(entry.size) === size);
    accumulator[size] = normalizePositiveInteger(matching?.stock ?? 0);
    return accumulator;
  }, {});

  const sizeGuide = uniqueSizes.map((size) => {
    const matching = sizeRows.find((entry) => normalizeSizeToken(entry.size) === size);
    const fallback = getDefaultGuideRow(size);

    return {
      size,
      widthCm: normalizeGuideNumber(matching?.width_cm, fallback.widthCm),
      lengthCm: normalizeGuideNumber(matching?.length_cm, fallback.lengthCm),
      sleeveCm: normalizeGuideNumber(matching?.sleeve_cm, fallback.sleeveCm),
    };
  });

  return normalizeProduct({
    id: row.id,
    name: row.name,
    image: row.image,
    category: row.category_id,
    description: row.description ?? undefined,
    sizes: uniqueSizes,
    stockBySize,
    sizeGuide,
    stock: sumStockBySize(stockBySize),
    price: normalizeNumber(row.price, 0),
    originalPrice:
      typeof row.original_price === 'number' && Number.isFinite(row.original_price)
        ? row.original_price
        : undefined,
    discountPercentage:
      typeof row.discount_percentage === 'number' && Number.isFinite(row.discount_percentage)
        ? row.discount_percentage
        : undefined,
  });
};

const productToRow = (product: Product) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  original_price: product.originalPrice ?? null,
  discount_percentage: product.discountPercentage ?? null,
  image: product.image,
  category_id: product.category,
  description: product.description ?? null,
});

const productToSizeRows = (product: Product): ProductSizeRow[] => {
  const sizes = product.sizes?.length ? product.sizes : ['UN'];
  const stockBySize = normalizeStockBySize(product.stockBySize, sizes, product.stock);
  const guide = normalizeSizeGuide(product.sizeGuide, sizes);

  return sizes.map((size) => {
    const guideRow = guide.find((entry) => entry.size === size) ?? getDefaultGuideRow(size);

    return {
      product_id: product.id,
      size,
      stock: normalizePositiveInteger(stockBySize[size]),
      width_cm: normalizeGuideNumber(guideRow.widthCm, guideRow.widthCm),
      length_cm: normalizeGuideNumber(guideRow.lengthCm, guideRow.lengthCm),
      sleeve_cm: normalizeGuideNumber(guideRow.sleeveCm, guideRow.sleeveCm),
    };
  });
};

const upsertCategoryRemote = async (category: ProductCategoryMeta) => {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.from('categories').upsert(
    {
      id: category.id,
      label: category.label,
      created_at: category.createdAt,
    },
    { onConflict: 'id' }
  );
};

const removeCategoryRemote = async (categoryId: string) => {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('categories').delete().eq('id', categoryId);
};

const upsertProductRemote = async (product: Product) => {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.from('products').upsert(productToRow(product), { onConflict: 'id' });

  const sizeRows = productToSizeRows(product);
  if (sizeRows.length > 0) {
    await supabase
      .from('product_sizes')
      .upsert(sizeRows, { onConflict: 'product_id,size' });
  }

  const { data: existingSizeRows } = await supabase
    .from('product_sizes')
    .select('size')
    .eq('product_id', product.id);

  if (!Array.isArray(existingSizeRows)) return;

  const nextSizes = new Set(sizeRows.map((entry) => entry.size));
  const obsoleteSizes = existingSizeRows
    .map((entry) => normalizeSizeToken((entry as { size?: string }).size))
    .filter((size) => !nextSizes.has(size));

  if (obsoleteSizes.length > 0) {
    await supabase
      .from('product_sizes')
      .delete()
      .eq('product_id', product.id)
      .in('size', obsoleteSizes);
  }
};

const removeProductRemote = async (productId: string) => {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('products').delete().eq('id', productId);
};

const syncProductStocksRemote = async (product: Product) => {
  if (!isSupabaseConfigured || !supabase) return;

  const sizes = product.sizes?.length ? product.sizes : ['UN'];
  const stockBySize = normalizeStockBySize(product.stockBySize, sizes, product.stock);

  await Promise.all(
    sizes.map((size) =>
      supabase
        .from('product_sizes')
        .update({ stock: normalizePositiveInteger(stockBySize[size]) })
        .eq('product_id', product.id)
        .eq('size', size)
    )
  );
};

const fetchRemoteCatalog = async (): Promise<{
  products: Product[];
  categories: ProductCategoryMeta[];
} | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  const [productsResponse, categoriesResponse] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, price, original_price, discount_percentage, image, category_id, description, product_sizes (product_id, size, stock, width_cm, length_cm, sleeve_cm)'
      ),
    supabase.from('categories').select('id, label, created_at'),
  ]);

  const productsData = Array.isArray(productsResponse.data) ? productsResponse.data : [];
  const categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];

  const products = productsData
    .map((entry) => productRowToProduct(entry))
    .filter((entry): entry is Product => Boolean(entry));
  const categories = categoriesData
    .map((entry) => categoryRowToMeta(entry))
    .filter((entry): entry is ProductCategoryMeta => Boolean(entry));

  return { products, categories };
};

const saveProducts = (products: Product[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));
  } catch {
    // Ignore storage failures to avoid breaking the storefront.
  }
};

const saveCategories = (categories: ProductCategoryMeta[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // Ignore storage failures to avoid breaking the storefront.
  }
};

const deriveCategoriesFromProducts = (products: Product[]): ProductCategoryMeta[] => {
  const ids = Array.from(new Set(products.map((product) => normalizeCategoryId(product.category))));

  return ids
    .filter(Boolean)
    .map((id) => ({
      id,
      label: toReadableCategoryLabel(id),
      createdAt: DEFAULT_CREATED_AT,
    }));
};

const mergeCategories = (
  primary: ProductCategoryMeta[],
  secondary: ProductCategoryMeta[]
): ProductCategoryMeta[] => {
  const next: ProductCategoryMeta[] = [];
  const knownIds = new Set<string>();

  [...primary, ...secondary].forEach((entry) => {
    if (!entry.id || knownIds.has(entry.id)) return;
    knownIds.add(entry.id);
    next.push(entry);
  });

  return next;
};

const areCategoriesEqual = (left: ProductCategoryMeta[], right: ProductCategoryMeta[]) => {
  if (left.length !== right.length) return false;

  return left.every((category, index) => {
    const compare = right[index];
    if (!compare) return false;

    return (
      category.id === compare.id &&
      category.label === compare.label &&
      category.createdAt === compare.createdAt
    );
  });
};

const normalizedSeedProducts: Product[] = seedProducts
  .map((entry) => normalizeProduct(entry))
  .filter((entry): entry is Product => Boolean(entry));

const getInitialProducts = (): Product[] => {
  if (typeof window === 'undefined') return normalizedSeedProducts;

  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) {
      saveProducts(normalizedSeedProducts);
      return normalizedSeedProducts;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveProducts(normalizedSeedProducts);
      return normalizedSeedProducts;
    }

    const normalized = parsed
      .map((entry) => normalizeProduct(entry))
      .filter((entry): entry is Product => Boolean(entry));

    if (normalized.length === 0) {
      saveProducts(normalizedSeedProducts);
      return normalizedSeedProducts;
    }

    return normalized;
  } catch {
    return normalizedSeedProducts;
  }
};

const getInitialCategories = (): ProductCategoryMeta[] => {
  const categoriesFromProducts = deriveCategoriesFromProducts(getInitialProducts());

  if (typeof window === 'undefined') return categoriesFromProducts;

  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) {
      saveCategories(categoriesFromProducts);
      return categoriesFromProducts;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveCategories(categoriesFromProducts);
      return categoriesFromProducts;
    }

    const normalized = parsed
      .map((entry) => normalizeCategoryMeta(entry))
      .filter((entry): entry is ProductCategoryMeta => Boolean(entry));

    const merged = mergeCategories(normalized, categoriesFromProducts);

    if (normalized.length !== merged.length) {
      saveCategories(merged);
    }

    return merged.length > 0 ? merged : categoriesFromProducts;
  } catch {
    return categoriesFromProducts;
  }
};

const buildUpdatedStockBySize = (
  currentProduct: Product,
  overrides: {
    sizes?: string[];
    stockBySize?: Record<string, number>;
    stock?: number;
  }
) => {
  const nextSizes = overrides.sizes ?? currentProduct.sizes ?? DEFAULT_SIZES;
  const fallbackStock =
    typeof overrides.stock === 'number'
      ? overrides.stock
      : typeof currentProduct.stock === 'number'
      ? currentProduct.stock
      : 0;

  const sourceStockMap = overrides.stockBySize ?? currentProduct.stockBySize;
  const nextStockBySize = normalizeStockBySize(sourceStockMap, nextSizes, fallbackStock);

  return {
    sizes: nextSizes,
    stockBySize: nextStockBySize,
    stock: sumStockBySize(nextStockBySize),
  };
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(getInitialProducts);
  const [categories, setCategories] = useState<ProductCategoryMeta[]>(getInitialCategories);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let active = true;

    void (async () => {
      const remote = await fetchRemoteCatalog();
      if (!remote || !active) return;

      const hasRemoteData = remote.products.length > 0 || remote.categories.length > 0;

      if (!hasRemoteData) {
        const seedCategories = deriveCategoriesFromProducts(normalizedSeedProducts);

        await Promise.all(seedCategories.map((category) => upsertCategoryRemote(category)));
        await Promise.all(normalizedSeedProducts.map((product) => upsertProductRemote(product)));

        if (!active) return;
        setProducts(normalizedSeedProducts);
        setCategories(seedCategories);
        return;
      }

      if (remote.products.length > 0) {
        setProducts(remote.products);
      }

      const derivedFromProducts = deriveCategoriesFromProducts(
        remote.products.length > 0 ? remote.products : normalizedSeedProducts
      );
      const mergedCategories = mergeCategories(remote.categories, derivedFromProducts);

      if (mergedCategories.length > 0) {
        setCategories(mergedCategories);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCategories((previous) => {
      const inferred = deriveCategoriesFromProducts(products);
      const merged = mergeCategories(previous, inferred);

      return areCategoriesEqual(previous, merged) ? previous : merged;
    });
  }, [products]);

  const getCategoryLabel = useCallback(
    (categoryId: string) => {
      const normalizedId = normalizeCategoryId(categoryId);
      const category = categories.find((entry) => entry.id === normalizedId);

      if (category) return category.label;
      return toReadableCategoryLabel(normalizedId);
    },
    [categories]
  );

  const getProductSizeStock = useCallback((product: Product, size?: string) => {
    if (size) {
      const normalizedSize = normalizeSizeToken(size);
      const stockBySize = product.stockBySize ?? {};
      return Math.max(0, normalizePositiveInteger(stockBySize[normalizedSize]));
    }

    return Math.max(0, normalizePositiveInteger(product.stock));
  }, []);

  const getProductById = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products]
  );

  const addCategory = useCallback(
    (label: string): CategoryActionResult => {
      const cleanedLabel = toTitleCase(label);
      if (cleanedLabel.length < 2) {
        return { success: false, error: 'Nome da categoria precisa ter ao menos 2 caracteres.' };
      }

      const categoryId = normalizeCategoryId(cleanedLabel);
      if (!categoryId) {
        return { success: false, error: 'Nome de categoria invalido.' };
      }

      const exists = categories.some((category) => category.id === categoryId);
      if (exists) {
        return { success: false, error: 'Esta categoria ja existe.' };
      }

      const nextCategory: ProductCategoryMeta = {
        id: categoryId,
        label: cleanedLabel,
        createdAt: new Date().toISOString(),
      };

      setCategories((previous) => [...previous, nextCategory]);
      void upsertCategoryRemote(nextCategory);
      return { success: true, category: nextCategory };
    },
    [categories]
  );

  const removeCategory = useCallback(
    (categoryId: string): CategoryActionResult => {
      const normalizedId = normalizeCategoryId(categoryId);

      if (!normalizedId) {
        return { success: false, error: 'Categoria invalida.' };
      }

      if (categories.length <= 1) {
        return {
          success: false,
          error: 'A loja precisa manter ao menos uma categoria ativa.',
        };
      }

      const inUse = products.some((product) => product.category === normalizedId);
      if (inUse) {
        return {
          success: false,
          error: 'Nao e possivel remover: existem produtos cadastrados nesta categoria.',
        };
      }

      setCategories((previous) => previous.filter((category) => category.id !== normalizedId));
      void removeCategoryRemote(normalizedId);
      return { success: true };
    },
    [categories.length, products]
  );

  const addProduct = useCallback(
    (draft: ProductDraft): ActionResult => {
      const normalized = normalizeProductDraft(draft);

      if (normalized.name.length < 3) {
        return { success: false, error: 'Nome precisa ter ao menos 3 caracteres.' };
      }

      if (normalized.image.length < 8) {
        return { success: false, error: 'Informe uma URL de imagem valida.' };
      }

      const hasCategory = categories.some((category) => category.id === normalized.category);
      if (!hasCategory) {
        return { success: false, error: 'Selecione uma categoria valida.' };
      }

      const pricing = resolvePricing({
        price: normalized.price,
        originalPrice: normalized.originalPrice,
        discountPercentage: normalized.discountPercentage,
      });

      if (!pricing) {
        return { success: false, error: 'Informe um preco valido para o produto.' };
      }

      const baseId = slugify(normalized.name) || 'produto';
      let candidateId = baseId;
      let index = 1;

      while (products.some((product) => product.id === candidateId)) {
        candidateId = `${baseId}-${index}`;
        index += 1;
      }

      const nextProduct: Product = {
        id: candidateId,
        name: normalized.name,
        image: normalized.image,
        category: normalized.category,
        description: normalized.description,
        sizes: normalized.sizes,
        stockBySize: normalized.stockBySize,
        sizeGuide: normalized.sizeGuide,
        stock: normalized.stock,
        price: pricing.price,
        originalPrice: pricing.originalPrice,
        discountPercentage: pricing.discountPercentage,
      };

      setProducts((previous) => [nextProduct, ...previous]);
      void upsertProductRemote(nextProduct);
      return { success: true };
    },
    [categories, products]
  );

  const updateProduct = useCallback(
    (productId: string, updates: Partial<Omit<Product, 'id'>>): boolean => {
      const target = products.find((product) => product.id === productId);
      if (!target) return false;
      let updatedProduct: Product | null = null;

      setProducts((previous) =>
        previous.map((product) => {
          if (product.id !== productId) return product;

          const nextName = updates.name?.trim() || product.name;
          const nextImage = updates.image?.trim() || product.image;
          const nextDescription = updates.description?.trim() || product.description;

          const requestedCategoryId =
            typeof updates.category === 'string' ? normalizeCategoryId(updates.category) : null;

          const canUseRequestedCategory = requestedCategoryId
            ? categories.some((category) => category.id === requestedCategoryId)
            : false;

          const nextCategory = canUseRequestedCategory ? requestedCategoryId : product.category;

          const normalizedSizes = updates.sizes ? normalizeSizes(updates.sizes) : product.sizes ?? DEFAULT_SIZES;
          const stockSetup = buildUpdatedStockBySize(product, {
            sizes: normalizedSizes,
            stockBySize: updates.stockBySize,
            stock: updates.stock,
          });

          const nextSizeGuide = updates.sizeGuide
            ? normalizeSizeGuide(updates.sizeGuide, stockSetup.sizes)
            : normalizeSizeGuide(product.sizeGuide, stockSetup.sizes);

          const hasPricingUpdates =
            typeof updates.price === 'number' ||
            typeof updates.originalPrice === 'number' ||
            typeof updates.discountPercentage === 'number';

          const pricing = hasPricingUpdates
            ? resolvePricing({
                price:
                  typeof updates.price === 'number' && Number.isFinite(updates.price)
                    ? updates.price
                    : product.price,
                originalPrice:
                  typeof updates.originalPrice === 'number' && Number.isFinite(updates.originalPrice)
                    ? updates.originalPrice
                    : product.originalPrice,
                discountPercentage:
                  typeof updates.discountPercentage === 'number' && Number.isFinite(updates.discountPercentage)
                    ? updates.discountPercentage
                    : product.discountPercentage,
              })
            : {
                price: product.price,
                originalPrice: product.originalPrice,
                discountPercentage: product.discountPercentage,
              };

          if (!pricing) {
            return product;
          }

          updatedProduct = {
            ...product,
            name: nextName,
            image: nextImage,
            description: nextDescription,
            category: nextCategory,
            sizes: stockSetup.sizes,
            stockBySize: stockSetup.stockBySize,
            stock: stockSetup.stock,
            sizeGuide: nextSizeGuide,
            price: pricing.price,
            originalPrice: pricing.originalPrice,
            discountPercentage: pricing.discountPercentage,
          };

          return updatedProduct;
        })
      );

      if (updatedProduct) {
        void upsertProductRemote(updatedProduct);
      }

      return true;
    },
    [categories, products]
  );

  const removeProduct = useCallback((productId: string) => {
    setProducts((previous) => previous.filter((product) => product.id !== productId));
    void removeProductRemote(productId);
  }, []);

  const adjustProductStock = useCallback((productId: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;
    let updatedProduct: Product | null = null;

    setProducts((previous) =>
      previous.map((product) => {
        if (product.id !== productId) return product;

        const sizeKey = normalizeSizeToken(product.sizes?.[0] ?? 'UN');
        const current = product.stockBySize ?? distributeStockAcrossSizes(product.stock, product.sizes ?? ['UN']);
        const nextStockBySize = {
          ...current,
          [sizeKey]: Math.max(0, normalizePositiveInteger(current[sizeKey]) + Math.round(delta)),
        };

        updatedProduct = {
          ...product,
          stockBySize: nextStockBySize,
          stock: sumStockBySize(nextStockBySize),
        };

        return updatedProduct;
      })
    );

    if (updatedProduct) {
      void syncProductStocksRemote(updatedProduct);
    }
  }, []);

  const adjustProductStockBySize = useCallback((productId: string, size: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;

    const normalizedSize = normalizeSizeToken(size);
    let updatedProduct: Product | null = null;

    setProducts((previous) =>
      previous.map((product) => {
        if (product.id !== productId) return product;

        const sizes = product.sizes ?? DEFAULT_SIZES;
        const currentStockBySize = normalizeStockBySize(product.stockBySize, sizes, product.stock);
        const currentQuantity = normalizePositiveInteger(currentStockBySize[normalizedSize]);

        const nextStockBySize = {
          ...currentStockBySize,
          [normalizedSize]: Math.max(0, currentQuantity + Math.round(delta)),
        };

        updatedProduct = {
          ...product,
          stockBySize: nextStockBySize,
          stock: sumStockBySize(nextStockBySize),
        };

        return updatedProduct;
      })
    );

    if (updatedProduct) {
      void syncProductStocksRemote(updatedProduct);
    }
  }, []);

  const consumeProductStock = useCallback(
    (items: StockItem[]): ConsumeStockResult => {
      const requestedByKey = new Map<string, { id: string; size: string; quantity: number }>();

      items.forEach((item) => {
        if (!item || item.quantity <= 0) return;

        const normalizedSize = normalizeSizeToken(item.size ?? 'UN');
        const key = `${item.id}::${normalizedSize}`;
        const existing = requestedByKey.get(key);

        if (existing) {
          existing.quantity += item.quantity;
          return;
        }

        requestedByKey.set(key, {
          id: item.id,
          size: normalizedSize,
          quantity: item.quantity,
        });
      });

      const issues: ConsumeStockIssue[] = [];

      requestedByKey.forEach((request) => {
        const product = products.find((entry) => entry.id === request.id);

        if (!product) {
          issues.push({
            productId: request.id,
            productName: 'Produto removido',
            size: request.size,
            requested: request.quantity,
            available: 0,
          });
          return;
        }

        const available = getProductSizeStock(product, request.size);

        if (available < request.quantity) {
          issues.push({
            productId: product.id,
            productName: product.name,
            size: request.size,
            requested: request.quantity,
            available,
          });
        }
      });

      if (issues.length > 0) {
        return { success: false, issues };
      }

      const touchedProducts: Product[] = [];

      setProducts((previous) =>
        previous.map((product) => {
          const relevantRequests = Array.from(requestedByKey.values()).filter(
            (request) => request.id === product.id
          );
          if (relevantRequests.length === 0) return product;

          const sizes = product.sizes ?? DEFAULT_SIZES;
          const stockBySize = normalizeStockBySize(product.stockBySize, sizes, product.stock);
          const nextStockBySize = { ...stockBySize };

          relevantRequests.forEach((request) => {
            const currentQuantity = normalizePositiveInteger(nextStockBySize[request.size]);
            nextStockBySize[request.size] = Math.max(0, currentQuantity - request.quantity);
          });

          const updatedProduct: Product = {
            ...product,
            stockBySize: nextStockBySize,
            stock: sumStockBySize(nextStockBySize),
          };

          touchedProducts.push(updatedProduct);
          return updatedProduct;
        })
      );

      if (touchedProducts.length > 0) {
        void Promise.all(touchedProducts.map((product) => syncProductStocksRemote(product)));
      }

      return { success: true };
    },
    [getProductSizeStock, products]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      categories,
      addProduct,
      updateProduct,
      removeProduct,
      adjustProductStock,
      adjustProductStockBySize,
      consumeProductStock,
      addCategory,
      removeCategory,
      getCategoryLabel,
      getProductSizeStock,
      getProductById,
    }),
    [
      products,
      categories,
      addProduct,
      updateProduct,
      removeProduct,
      adjustProductStock,
      adjustProductStockBySize,
      consumeProductStock,
      addCategory,
      removeCategory,
      getCategoryLabel,
      getProductSizeStock,
      getProductById,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }

  return context;
};

export type { CategoryActionResult, ConsumeStockIssue, ProductDraft, StockItem };
