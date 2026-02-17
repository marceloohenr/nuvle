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
import { useAuth } from '../../auth';
import { useCatalog, type Product } from '../../catalog';
import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase';

interface FavoritesContextValue {
  favoriteProductIds: string[];
  favorites: Product[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  removeFavorite: (productId: string) => Promise<void>;
}

type FavoritesMap = Record<string, string[]>;

interface FavoriteRow {
  product_id: string;
  created_at: string;
}

const FAVORITES_STORAGE_KEY = 'nuvle-favorites-v1';

const normalizeFavoriteIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique: string[] = [];
  const seen = new Set<string>();

  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(normalized);
  });

  return unique;
};

const readFavoritesMap = (): FavoritesMap => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const entries = Object.entries(parsed as Record<string, unknown>);

    return entries.reduce<FavoritesMap>((accumulator, [scope, ids]) => {
      accumulator[scope] = normalizeFavoriteIds(ids);
      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

const saveFavoritesMap = (nextMap: FavoritesMap) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // Keep app functional if storage quota is exceeded.
  }
};

const getFavoritesScopeKey = (userId: string | null | undefined) => {
  const normalized = userId?.trim();
  return normalized ? `user:${normalized}` : 'guest';
};

const getLocalFavoriteIds = (scopeKey: string) => {
  const map = readFavoritesMap();
  return map[scopeKey] ?? [];
};

const saveLocalFavoriteIds = (scopeKey: string, ids: string[]) => {
  const map = readFavoritesMap();
  map[scopeKey] = normalizeFavoriteIds(ids);
  saveFavoritesMap(map);
};

const isMissingFavoritesSchema = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const payload = error as { message?: string; details?: string; code?: string };
  const combined = `${payload.message ?? ''} ${payload.details ?? ''}`.toLowerCase();

  return (
    payload.code === '42P01' ||
    payload.code === 'PGRST204' ||
    payload.code === 'PGRST205' ||
    (combined.includes('favorites') &&
      (combined.includes('does not exist') || combined.includes('schema cache')))
  );
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const { products } = useCatalog();
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const scopeKey = getFavoritesScopeKey(currentUser?.id);

  useEffect(() => {
    let active = true;
    const local = getLocalFavoriteIds(scopeKey);
    setFavoriteProductIds(local);

    if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        if (!isMissingFavoritesSchema(error)) {
          // Keep local data if remote fetch fails.
        }
        return;
      }

      const remoteIds = normalizeFavoriteIds(
        Array.isArray(data) ? data.map((row) => (row as FavoriteRow).product_id) : []
      );

      setFavoriteProductIds(remoteIds);
      saveLocalFavoriteIds(scopeKey, remoteIds);
    })();

    return () => {
      active = false;
    };
  }, [currentUser?.id, scopeKey]);

  const favoriteIdSet = useMemo(() => new Set(favoriteProductIds), [favoriteProductIds]);

  const favorites = useMemo(() => {
    return favoriteProductIds
      .map((productId) => products.find((product) => product.id === productId))
      .filter((product): product is Product => Boolean(product));
  }, [favoriteProductIds, products]);

  const isFavorite = useCallback(
    (productId: string) => {
      const normalized = productId.trim();
      if (!normalized) return false;
      return favoriteIdSet.has(normalized);
    },
    [favoriteIdSet]
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      const normalized = productId.trim();
      if (!normalized) return false;

      let willBeFavorite = false;

      setFavoriteProductIds((previous) => {
        const alreadyFavorite = previous.includes(normalized);
        willBeFavorite = !alreadyFavorite;
        const next = alreadyFavorite
          ? previous.filter((entry) => entry !== normalized)
          : [normalized, ...previous];
        saveLocalFavoriteIds(scopeKey, next);
        return next;
      });

      if (isSupabaseConfigured && supabase && currentUser?.id) {
        if (willBeFavorite) {
          const { error } = await supabase.from('favorites').upsert(
            {
              user_id: currentUser.id,
              product_id: normalized,
            },
            { onConflict: 'user_id,product_id' }
          );

          if (error && !isMissingFavoritesSchema(error)) {
            // Keep local favorite state as fallback.
          }
        } else {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', normalized);

          if (error && !isMissingFavoritesSchema(error)) {
            // Keep local favorite state as fallback.
          }
        }
      }

      return willBeFavorite;
    },
    [currentUser?.id, scopeKey]
  );

  const removeFavorite = useCallback(
    async (productId: string) => {
      const normalized = productId.trim();
      if (!normalized) return;

      setFavoriteProductIds((previous) => {
        const next = previous.filter((entry) => entry !== normalized);
        saveLocalFavoriteIds(scopeKey, next);
        return next;
      });

      if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('product_id', normalized);

      if (error && !isMissingFavoritesSchema(error)) {
        // Keep local favorite state as fallback.
      }
    },
    [currentUser?.id, scopeKey]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteProductIds,
      favorites,
      isFavorite,
      toggleFavorite,
      removeFavorite,
    }),
    [favoriteProductIds, favorites, isFavorite, toggleFavorite, removeFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
