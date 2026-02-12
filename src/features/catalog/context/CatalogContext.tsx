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
import { products as seedProducts } from '../data/products';
import type { Product, ProductCategory, ProductCategoryMeta } from '../types/product';

interface ProductDraft {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: ProductCategory;
  description?: string;
  sizes?: string[];
  stock: number;
}

interface StockItem {
  id: string;
  quantity: number;
}

interface ConsumeStockIssue {
  productId: string;
  productName: string;
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
  consumeProductStock: (items: StockItem[]) => ConsumeStockResult;
  addCategory: (label: string) => CategoryActionResult;
  removeCategory: (categoryId: string) => CategoryActionResult;
  getCategoryLabel: (categoryId: string) => string;
  getProductById: (productId: string) => Product | undefined;
}

const CATALOG_STORAGE_KEY = 'nuvle-catalog-v1';
const CATEGORIES_STORAGE_KEY = 'nuvle-categories-v1';
const DEFAULT_STOCK = 20;
const DEFAULT_SIZES = ['P', 'M', 'G', 'GG'];
const DEFAULT_CREATED_AT = '2026-01-01T00:00:00.000Z';

const defaultCategoryLabels: Record<string, string> = {
  basicas: 'Basicas',
  estampadas: 'Estampadas',
  oversized: 'Oversized',
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
    .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : ''))
    .filter((entry) => entry.length > 0);

  return sizes.length > 0 ? Array.from(new Set(sizes)) : DEFAULT_SIZES;
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

  const normalizedPrice = Number(item.price);
  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) return null;

  const normalizedOriginalPrice =
    typeof item.originalPrice === 'number' && Number.isFinite(item.originalPrice)
      ? Math.max(item.originalPrice, normalizedPrice)
      : undefined;

  const normalizedStock =
    typeof item.stock === 'number' && Number.isFinite(item.stock)
      ? Math.max(0, Math.round(item.stock))
      : DEFAULT_STOCK;

  return {
    id: item.id,
    name: item.name,
    image: item.image,
    category: categoryId,
    price: normalizedPrice,
    originalPrice: normalizedOriginalPrice,
    description: typeof item.description === 'string' ? item.description : undefined,
    sizes: normalizeSizes(item.sizes),
    stock: normalizedStock,
  };
};

const normalizeProductDraft = (draft: ProductDraft): ProductDraft => {
  return {
    ...draft,
    name: draft.name.trim(),
    image: draft.image.trim(),
    description: draft.description?.trim(),
    category: normalizeCategoryId(draft.category),
    price: Number(draft.price),
    originalPrice:
      typeof draft.originalPrice === 'number' && Number.isFinite(draft.originalPrice)
        ? Number(draft.originalPrice)
        : undefined,
    sizes: normalizeSizes(draft.sizes),
    stock: Math.max(0, Math.round(Number(draft.stock) || 0)),
  };
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

const getInitialProducts = (): Product[] => {
  if (typeof window === 'undefined') return seedProducts;

  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) {
      saveProducts(seedProducts);
      return seedProducts;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveProducts(seedProducts);
      return seedProducts;
    }

    const normalized = parsed
      .map((entry) => normalizeProduct(entry))
      .filter((entry): entry is Product => Boolean(entry));

    if (normalized.length === 0) {
      saveProducts(seedProducts);
      return seedProducts;
    }

    return normalized;
  } catch {
    return seedProducts;
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

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(getInitialProducts);
  const [categories, setCategories] = useState<ProductCategoryMeta[]>(getInitialCategories);

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

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

      if (normalized.price <= 0) {
        return { success: false, error: 'Preco deve ser maior que zero.' };
      }

      if (normalized.image.length < 8) {
        return { success: false, error: 'Informe uma URL de imagem valida.' };
      }

      const hasCategory = categories.some((category) => category.id === normalized.category);
      if (!hasCategory) {
        return { success: false, error: 'Selecione uma categoria valida.' };
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
        price: normalized.price,
        originalPrice:
          normalized.originalPrice && normalized.originalPrice > normalized.price
            ? normalized.originalPrice
            : undefined,
        image: normalized.image,
        category: normalized.category,
        description: normalized.description,
        sizes: normalized.sizes,
        stock: normalized.stock,
      };

      setProducts((previous) => [nextProduct, ...previous]);
      return { success: true };
    },
    [categories, products]
  );

  const updateProduct = useCallback(
    (productId: string, updates: Partial<Omit<Product, 'id'>>): boolean => {
      const target = products.find((product) => product.id === productId);
      if (!target) return false;

      setProducts((previous) =>
        previous.map((product) => {
          if (product.id !== productId) return product;

          const nextPrice =
            typeof updates.price === 'number' && updates.price > 0
              ? updates.price
              : product.price;

          const nextStock =
            typeof updates.stock === 'number'
              ? Math.max(0, Math.round(updates.stock))
              : product.stock;

          const requestedCategoryId =
            typeof updates.category === 'string' ? normalizeCategoryId(updates.category) : null;

          const canUseRequestedCategory = requestedCategoryId
            ? categories.some((category) => category.id === requestedCategoryId)
            : false;

          return {
            ...product,
            ...updates,
            name: updates.name?.trim() || product.name,
            image: updates.image?.trim() || product.image,
            description: updates.description?.trim() || product.description,
            sizes: updates.sizes ? normalizeSizes(updates.sizes) : product.sizes,
            category: canUseRequestedCategory ? requestedCategoryId : product.category,
            price: nextPrice,
            originalPrice:
              typeof updates.originalPrice === 'number' && updates.originalPrice > nextPrice
                ? updates.originalPrice
                : product.originalPrice,
            stock: nextStock,
          };
        })
      );

      return true;
    },
    [categories, products]
  );

  const removeProduct = useCallback((productId: string) => {
    setProducts((previous) => previous.filter((product) => product.id !== productId));
  }, []);

  const adjustProductStock = useCallback((productId: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;

    setProducts((previous) =>
      previous.map((product) =>
        product.id === productId
          ? { ...product, stock: Math.max(0, product.stock + Math.round(delta)) }
          : product
      )
    );
  }, []);

  const consumeProductStock = useCallback(
    (items: StockItem[]): ConsumeStockResult => {
      const requestedByProduct = new Map<string, number>();

      items.forEach((item) => {
        if (!item || item.quantity <= 0) return;
        const currentRequested = requestedByProduct.get(item.id) ?? 0;
        requestedByProduct.set(item.id, currentRequested + item.quantity);
      });

      const issues: ConsumeStockIssue[] = [];

      requestedByProduct.forEach((requested, productId) => {
        const product = products.find((entry) => entry.id === productId);

        if (!product) {
          issues.push({
            productId,
            productName: 'Produto removido',
            requested,
            available: 0,
          });
          return;
        }

        if (product.stock < requested) {
          issues.push({
            productId,
            productName: product.name,
            requested,
            available: product.stock,
          });
        }
      });

      if (issues.length > 0) {
        return { success: false, issues };
      }

      setProducts((previous) =>
        previous.map((product) => {
          const requested = requestedByProduct.get(product.id);
          if (!requested) return product;

          return { ...product, stock: Math.max(0, product.stock - requested) };
        })
      );

      return { success: true };
    },
    [products]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      categories,
      addProduct,
      updateProduct,
      removeProduct,
      adjustProductStock,
      consumeProductStock,
      addCategory,
      removeCategory,
      getCategoryLabel,
      getProductById,
    }),
    [
      products,
      categories,
      addProduct,
      updateProduct,
      removeProduct,
      adjustProductStock,
      consumeProductStock,
      addCategory,
      removeCategory,
      getCategoryLabel,
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
