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

export type SocialPlatform =
  | 'tiktok'
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'whatsapp'
  | 'linkedin';

export interface StoreContactSettings {
  whatsappLabel: string;
  whatsappUrl: string;
  email: string;
  handle: string;
}

export type StoreSocialLinks = Record<SocialPlatform, string>;

export interface StoreSettings {
  contact: StoreContactSettings;
  socialLinks: StoreSocialLinks;
}

interface StoreSettingsContextValue {
  settings: StoreSettings;
  setSettings: (nextSettings: StoreSettings) => void;
  updateSettings: (updates: Partial<StoreSettings>) => void;
}

const STORE_SETTINGS_STORAGE_KEY = 'nuvle-store-settings-v1';

const defaultSettings: StoreSettings = {
  contact: {
    whatsappLabel: '(81) 98896-6556',
    whatsappUrl: 'https://wa.me/5581988966556',
    email: 'nuvleoficial@gmail.com',
    handle: '@nuvleoficial',
  },
  socialLinks: {
    tiktok: '',
    instagram: 'https://instagram.com/nuvleoficial',
    x: '',
    facebook: '',
    whatsapp: 'https://wa.me/5581988966556',
    linkedin: '',
  },
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeContact = (value: unknown): StoreContactSettings => {
  if (!value || typeof value !== 'object') {
    return defaultSettings.contact;
  }

  const payload = value as Partial<StoreContactSettings>;

  return {
    whatsappLabel: normalizeText(payload.whatsappLabel) || defaultSettings.contact.whatsappLabel,
    whatsappUrl: normalizeText(payload.whatsappUrl) || defaultSettings.contact.whatsappUrl,
    email: normalizeText(payload.email) || defaultSettings.contact.email,
    handle: normalizeText(payload.handle) || defaultSettings.contact.handle,
  };
};

const normalizeSocialLinks = (value: unknown): StoreSocialLinks => {
  if (!value || typeof value !== 'object') {
    return defaultSettings.socialLinks;
  }

  const payload = value as Partial<Record<SocialPlatform, string>>;

  return {
    tiktok: normalizeText(payload.tiktok),
    instagram: normalizeText(payload.instagram),
    x: normalizeText(payload.x),
    facebook: normalizeText(payload.facebook),
    whatsapp: normalizeText(payload.whatsapp) || defaultSettings.socialLinks.whatsapp,
    linkedin: normalizeText(payload.linkedin),
  };
};

const normalizeSettings = (value: unknown): StoreSettings => {
  if (!value || typeof value !== 'object') {
    return defaultSettings;
  }

  const payload = value as Partial<StoreSettings>;

  return {
    contact: normalizeContact(payload.contact),
    socialLinks: normalizeSocialLinks(payload.socialLinks),
  };
};

const saveSettings = (settings: StoreSettings) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures to avoid breaking navigation.
  }
};

const getInitialSettings = (): StoreSettings => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const raw = localStorage.getItem(STORE_SETTINGS_STORAGE_KEY);
    if (!raw) {
      saveSettings(defaultSettings);
      return defaultSettings;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeSettings(parsed);
    return normalized;
  } catch {
    return defaultSettings;
  }
};

const StoreSettingsContext = createContext<StoreSettingsContextValue | null>(null);

export const StoreSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<StoreSettings>(getInitialSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setSettings = useCallback((nextSettings: StoreSettings) => {
    setSettingsState(normalizeSettings(nextSettings));
  }, []);

  const updateSettings = useCallback((updates: Partial<StoreSettings>) => {
    setSettingsState((previous) => {
      const merged: StoreSettings = {
        contact: {
          ...previous.contact,
          ...(updates.contact ?? {}),
        },
        socialLinks: {
          ...previous.socialLinks,
          ...(updates.socialLinks ?? {}),
        },
      };

      return normalizeSettings(merged);
    });
  }, []);

  const value = useMemo<StoreSettingsContextValue>(
    () => ({
      settings,
      setSettings,
      updateSettings,
    }),
    [settings, setSettings, updateSettings]
  );

  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);

  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }

  return context;
};

export { defaultSettings };
