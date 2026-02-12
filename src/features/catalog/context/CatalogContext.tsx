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
import type { Product, ProductCategory } from '../types/product';

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

interface CatalogContextValue {
  products: Product[];
  addProduct: (product: ProductDraft) => { success: boolean; error?: string };
  updateProduct: (productId: string, updates: Partial<Omit<Product, 'id'>>) => boolean;
  removeProduct: (productId: string) => void;
  adjustProductStock: (productId: string, delta: number) => void;
  consumeProductStock: (items: StockItem[]) => ConsumeStockResult;
  getProductById: (productId: string) => Product | undefined;
}

const CATALOG_STORAGE_KEY = 'nuvle-catalog-v1';
const DEFAULT_STOCK = 20;

const isProductCategory = (value: unknown): value is ProductCategory => {
  return value === 'basicas' || value === 'estampadas' || value === 'oversized';
};

const normalizeSizes = (value: unknown): string[] => {
  if (!Array.isArray(value)) return ['P', 'M', 'G', 'GG'];

  const sizes = value
    .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : ''))
    .filter((entry) => entry.length > 0);

  return sizes.length > 0 ? Array.from(new Set(sizes)) : ['P', 'M', 'G', 'GG'];
};

const normalizeProduct = (value: unknown): Product | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Product>;

  if (
    !item.id ||
    !item.name ||
    !item.image ||
    !isProductCategory(item.category) ||
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
    category: item.category,
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

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(getInitialProducts);

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  const getProductById = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products]
  );

  const addProduct = useCallback(
    (draft: ProductDraft): { success: boolean; error?: string } => {
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

      const baseId = slugify(normalized.name) || 'camiseta';
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

      setProducts((prev) => [nextProduct, ...prev]);
      return { success: true };
    },
    [products]
  );

  const updateProduct = useCallback(
    (productId: string, updates: Partial<Omit<Product, 'id'>>): boolean => {
      const target = products.find((product) => product.id === productId);
      if (!target) return false;

      setProducts((prev) =>
        prev.map((product) => {
          if (product.id !== productId) return product;

          const nextPrice =
            typeof updates.price === 'number' && updates.price > 0
              ? updates.price
              : product.price;
          const nextStock =
            typeof updates.stock === 'number'
              ? Math.max(0, Math.round(updates.stock))
              : product.stock;

          return {
            ...product,
            ...updates,
            name: updates.name?.trim() || product.name,
            image: updates.image?.trim() || product.image,
            description: updates.description?.trim() || product.description,
            sizes: updates.sizes ? normalizeSizes(updates.sizes) : product.sizes,
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
    [products]
  );

  const removeProduct = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== productId));
  }, []);

  const adjustProductStock = useCallback((productId: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;

    setProducts((prev) =>
      prev.map((product) =>
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

      setProducts((prev) =>
        prev.map((product) => {
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
      addProduct,
      updateProduct,
      removeProduct,
      adjustProductStock,
      consumeProductStock,
      getProductById,
    }),
    [products, addProduct, updateProduct, removeProduct, adjustProductStock, consumeProductStock, getProductById]
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

export type { ConsumeStockIssue, ProductDraft, StockItem };
