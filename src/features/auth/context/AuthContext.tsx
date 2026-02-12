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
  login: (payload: LoginPayload) => ActionResult;
  register: (payload: RegisterPayload) => ActionResult;
  logout: () => void;
}

const USERS_STORAGE_KEY = 'nuvle-users-v1';
const SESSION_STORAGE_KEY = 'nuvle-session-v1';

export const demoAdminCredentials = {
  email: 'admin@nuvle.com',
  password: 'admin123',
} as const;

const adminSeedUser: StoredAuthUser = {
  id: 'admin-root',
  name: 'Administrador Nuvle',
  email: demoAdminCredentials.email,
  password: demoAdminCredentials.password,
  role: 'admin',
  createdAt: '2026-01-01T12:00:00.000Z',
};

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

const saveUsers = (users: StoredAuthUser[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage failures to keep the app usable.
  }
};

const ensureAdminUser = (users: StoredAuthUser[]): StoredAuthUser[] => {
  const hasAdmin = users.some(
    (user) => user.email.toLowerCase() === adminSeedUser.email.toLowerCase()
  );

  if (hasAdmin) return users;
  return [adminSeedUser, ...users];
};

const getInitialUsers = (): StoredAuthUser[] => {
  if (typeof window === 'undefined') return [adminSeedUser];

  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      saveUsers([adminSeedUser]);
      return [adminSeedUser];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveUsers([adminSeedUser]);
      return [adminSeedUser];
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
    return [adminSeedUser];
  }
};

const getInitialSessionUserId = (): string | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw && raw.trim().length > 0 ? raw : null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const generateUserId = () =>
  `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [storedUsers, setStoredUsers] = useState<StoredAuthUser[]>(getInitialUsers);
  const [sessionUserId, setSessionUserId] = useState<string | null>(getInitialSessionUserId);

  useEffect(() => {
    saveUsers(storedUsers);
  }, [storedUsers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
    if (!sessionUserId) return;

    const userExists = storedUsers.some((user) => user.id === sessionUserId);
    if (!userExists) {
      setSessionUserId(null);
    }
  }, [sessionUserId, storedUsers]);

  const currentStoredUser = useMemo(() => {
    if (!sessionUserId) return null;
    return storedUsers.find((user) => user.id === sessionUserId) ?? null;
  }, [sessionUserId, storedUsers]);

  const login = useCallback(
    ({ email, password }: LoginPayload): ActionResult => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return { success: false, error: 'Informe e-mail e senha.' };
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
    ({ name, email, password }: RegisterPayload): ActionResult => {
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

  const logout = useCallback(() => {
    setSessionUserId(null);
  }, []);

  const currentUser = currentStoredUser ? toPublicUser(currentStoredUser) : null;
  const users = useMemo(() => storedUsers.map((user) => toPublicUser(user)), [storedUsers]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentUser?.role === 'admin',
      login,
      register,
      logout,
    }),
    [currentUser, users, login, register, logout]
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
