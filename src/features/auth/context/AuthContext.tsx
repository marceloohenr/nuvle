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
import type { AuthUser, StoredAuthUser, UserRole } from '../types/user';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  role?: UserRole;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  users: AuthUser[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthReady: boolean;
  login: (payload: LoginPayload) => Promise<ActionResult>;
  register: (payload: RegisterPayload) => Promise<ActionResult>;
  logout: () => Promise<void>;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

const USERS_STORAGE_KEY = 'nuvle-users-v1';
const SESSION_STORAGE_KEY = 'nuvle-session-v1';

const demoAdminCredentials = {
  email: 'admin@nuvle.com',
  password: 'admin123',
} as const;

const shouldSeedDemoAdmin = import.meta.env.DEV;

const adminSeedUser: StoredAuthUser | null = shouldSeedDemoAdmin
  ? {
      id: 'admin-root',
      name: 'Administrador Nuvle',
      email: demoAdminCredentials.email,
      password: demoAdminCredentials.password,
      role: 'admin',
      createdAt: '2026-01-01T12:00:00.000Z',
    }
  : null;

const isRole = (value: unknown): value is UserRole => {
  return value === 'admin' || value === 'customer';
};

const toPublicUser = (user: StoredAuthUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const profileToAuthUser = (profile: ProfileRow): AuthUser => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  createdAt: profile.created_at,
});

const normalizeStoredUser = (value: unknown): StoredAuthUser | null => {
  if (!value || typeof value !== 'object') return null;
  const user = value as Partial<StoredAuthUser>;

  if (
    !user.id ||
    !user.name ||
    !user.email ||
    !user.password ||
    !user.createdAt ||
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.password !== 'string' ||
    typeof user.createdAt !== 'string' ||
    !isRole(user.role)
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    createdAt: user.createdAt,
  };
};

const normalizeProfileRow = (value: unknown): ProfileRow | null => {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Partial<ProfileRow>;

  if (
    !profile.id ||
    !profile.name ||
    !profile.email ||
    !profile.created_at ||
    typeof profile.id !== 'string' ||
    typeof profile.name !== 'string' ||
    typeof profile.email !== 'string' ||
    typeof profile.created_at !== 'string' ||
    !isRole(profile.role)
  ) {
    return null;
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    created_at: profile.created_at,
  };
};

const saveUsers = (users: StoredAuthUser[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage failures to keep the app usable.
  }
};

const ensureAdminUser = (users: StoredAuthUser[]): StoredAuthUser[] => {
  if (!adminSeedUser) return users;

  const hasAdmin = users.some(
    (user) => user.email.toLowerCase() === adminSeedUser.email.toLowerCase()
  );

  if (hasAdmin) return users;
  return [adminSeedUser, ...users];
};

const getInitialUsers = (): StoredAuthUser[] => {
  if (typeof window === 'undefined') return adminSeedUser ? [adminSeedUser] : [];

  const fallbackUsers = adminSeedUser ? [adminSeedUser] : [];

  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      saveUsers(fallbackUsers);
      return fallbackUsers;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveUsers(fallbackUsers);
      return fallbackUsers;
    }

    const normalized = parsed
      .map((entry) => normalizeStoredUser(entry))
      .filter((entry): entry is StoredAuthUser => Boolean(entry));
    const usersWithAdmin = ensureAdminUser(normalized);

    if (usersWithAdmin.length !== normalized.length) {
      saveUsers(usersWithAdmin);
    }

    return usersWithAdmin;
  } catch {
    return fallbackUsers;
  }
};

const getInitialSessionUserId = (): string | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw && raw.trim().length > 0 ? raw : null;
};

const getFallbackNameFromEmail = (email: string) => {
  const prefix = email.split('@')[0] ?? 'Cliente';
  if (!prefix) return 'Cliente';

  return prefix
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ensureSupabaseProfile = async (authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<AuthUser | null> => {
  if (!supabase) return null;

  const { data: existingData, error: existingError } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingError) return null;

  const existingProfile = normalizeProfileRow(existingData);
  if (existingProfile) {
    return profileToAuthUser(existingProfile);
  }

  const email = authUser.email ?? '';
  const nameFromMetadata =
    typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : '';
  const nextName = (nameFromMetadata || getFallbackNameFromEmail(email)).trim() || 'Cliente';

  const { data: upsertedData, error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        name: nextName,
        email,
        role: 'customer',
      },
      { onConflict: 'id' }
    )
    .select('id, name, email, role, created_at')
    .maybeSingle();

  if (upsertError) return null;

  const profile = normalizeProfileRow(upsertedData);
  return profile ? profileToAuthUser(profile) : null;
};

const fetchSupabaseUsers = async (): Promise<AuthUser[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((entry) => normalizeProfileRow(entry))
    .filter((entry): entry is ProfileRow => Boolean(entry))
    .map((profile) => profileToAuthUser(profile));
};

const AuthContext = createContext<AuthContextValue | null>(null);

const generateUserId = () =>
  `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [storedUsers, setStoredUsers] = useState<StoredAuthUser[]>(
    isSupabaseConfigured ? [] : getInitialUsers
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(
    isSupabaseConfigured ? null : getInitialSessionUserId
  );

  const [supabaseCurrentUser, setSupabaseCurrentUser] = useState<AuthUser | null>(null);
  const [supabaseUsers, setSupabaseUsers] = useState<AuthUser[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    saveUsers(storedUsers);
  }, [storedUsers]);

  useEffect(() => {
    if (isSupabaseConfigured || typeof window === 'undefined') return;

    try {
      if (!sessionUserId) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      localStorage.setItem(SESSION_STORAGE_KEY, sessionUserId);
    } catch {
      // Ignore storage failures to keep login flow working.
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (isSupabaseConfigured || !sessionUserId) return;

    const userExists = storedUsers.some((user) => user.id === sessionUserId);
    if (!userExists) {
      setSessionUserId(null);
    }
  }, [sessionUserId, storedUsers]);

  const currentStoredUser = useMemo(() => {
    if (isSupabaseConfigured || !sessionUserId) return null;
    return storedUsers.find((user) => user.id === sessionUserId) ?? null;
  }, [sessionUserId, storedUsers]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    setIsAuthReady(false);

    const syncFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;

      if (!authUser) {
        if (!isMounted) return;
        setSupabaseCurrentUser(null);
        setSupabaseUsers([]);
        setIsAuthReady(true);
        return;
      }

      const profile = await ensureSupabaseProfile({
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata as Record<string, unknown> | undefined,
      });

      if (!isMounted) return;

      setSupabaseCurrentUser(profile);

      if (profile?.role === 'admin') {
        const users = await fetchSupabaseUsers();
        if (!isMounted) return;
        setSupabaseUsers(users);
      } else {
        setSupabaseUsers(profile ? [profile] : []);
      }

      if (isMounted) {
        setIsAuthReady(true);
      }
    };

    void syncFromSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;

      if (!authUser) {
        setSupabaseCurrentUser(null);
        setSupabaseUsers([]);
        setIsAuthReady(true);
        return;
      }

      void (async () => {
        const profile = await ensureSupabaseProfile({
          id: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata as Record<string, unknown> | undefined,
        });

        if (!isMounted) return;

        setSupabaseCurrentUser(profile);

        if (profile?.role === 'admin') {
          const users = await fetchSupabaseUsers();
          if (!isMounted) return;
          setSupabaseUsers(users);
        } else {
          setSupabaseUsers(profile ? [profile] : []);
        }

        if (isMounted) {
          setIsAuthReady(true);
        }
      })();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async ({ email, password }: LoginPayload): Promise<ActionResult> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return { success: false, error: 'Informe e-mail e senha.' };
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data.user) {
          return {
            success: false,
            error: error?.message ?? 'E-mail ou senha invalidos.',
          };
        }

        const profile = await ensureSupabaseProfile({
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata as Record<string, unknown> | undefined,
        });

        if (!profile) {
          return {
            success: false,
            error: 'Conta autenticada, mas o perfil nao foi encontrado no banco.',
          };
        }

        setSupabaseCurrentUser(profile);

        if (profile.role === 'admin') {
          setSupabaseUsers(await fetchSupabaseUsers());
        } else {
          setSupabaseUsers([profile]);
        }

        return { success: true, role: profile.role };
      }

      const user = storedUsers.find(
        (item) =>
          item.email.trim().toLowerCase() === normalizedEmail && item.password === password
      );

      if (!user) {
        return { success: false, error: 'E-mail ou senha invalidos.' };
      }

      setSessionUserId(user.id);
      return { success: true, role: user.role };
    },
    [storedUsers]
  );

  const register = useCallback(
    async ({ name, email, password }: RegisterPayload): Promise<ActionResult> => {
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedName.length < 3) {
        return { success: false, error: 'Nome precisa ter ao menos 3 caracteres.' };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, error: 'Informe um e-mail valido.' };
      }

      if (password.length < 6) {
        return { success: false, error: 'Senha precisa ter ao menos 6 caracteres.' };
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: normalizedName,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        const authUser = data.user;
        const activeSessionUser = data.session?.user;

        if (activeSessionUser) {
          const profile = await ensureSupabaseProfile({
            id: activeSessionUser.id,
            email: activeSessionUser.email,
            user_metadata:
              activeSessionUser.user_metadata as Record<string, unknown> | undefined,
          });

          if (!profile) {
            return {
              success: false,
              error: 'Conta criada, mas nao foi possivel criar o perfil no banco.',
            };
          }

          setSupabaseCurrentUser(profile);
          setSupabaseUsers([profile]);

          return { success: true, role: profile.role };
        }

        if (authUser) {
          return {
            success: false,
            error:
              'Conta criada. Confirme seu e-mail no link enviado e depois faca login.',
          };
        }

        return { success: false, error: 'Nao foi possivel criar sua conta agora.' };
      }

      const hasEmail = storedUsers.some(
        (user) => user.email.trim().toLowerCase() === normalizedEmail
      );

      if (hasEmail) {
        return { success: false, error: 'Este e-mail ja esta cadastrado.' };
      }

      const newUser: StoredAuthUser = {
        id: generateUserId(),
        name: normalizedName,
        email: normalizedEmail,
        password,
        role: 'customer',
        createdAt: new Date().toISOString(),
      };

      setStoredUsers((prev) => [...prev, newUser]);
      setSessionUserId(newUser.id);

      return { success: true, role: newUser.role };
    },
    [storedUsers]
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setSupabaseCurrentUser(null);
      setSupabaseUsers([]);
      return;
    }

    setSessionUserId(null);
  }, []);

  const currentUser = isSupabaseConfigured
    ? supabaseCurrentUser
    : currentStoredUser
    ? toPublicUser(currentStoredUser)
    : null;

  const users = useMemo(() => {
    if (isSupabaseConfigured) return supabaseUsers;
    return storedUsers.map((user) => toPublicUser(user));
  }, [storedUsers, supabaseUsers]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentUser?.role === 'admin',
      isAuthReady,
      login,
      register,
      logout,
    }),
    [currentUser, users, isAuthReady, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
