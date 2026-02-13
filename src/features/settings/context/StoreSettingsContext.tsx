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

interface StoreSettingsRow {
  id: number;
  whatsapp_label: string;
  whatsapp_url: string;
  contact_email: string;
  contact_handle: string;
  tiktok_url: string;
  instagram_url: string;
  x_url: string;
  facebook_url: string;
  whatsapp_social_url: string;
  linkedin_url: string;
}

const STORE_SETTINGS_STORAGE_KEY = 'nuvle-store-settings-v1';

const defaultSettings: StoreSettings = {
  contact: {
    whatsappLabel: '(81) 98896-6556',
    whatsappUrl: 'https://wa.me/5581988966556',
    email: 'nuvleoficial@gmail.com',
    handle: 'nuvleoficial',
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
    handle:
      normalizeText(payload.handle).replace(/^@+/, '') || defaultSettings.contact.handle,
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

const normalizeSettingsRow = (value: unknown): StoreSettings | null => {
  if (!value || typeof value !== 'object') return null;

  const row = value as Partial<StoreSettingsRow>;

  return normalizeSettings({
    contact: {
      whatsappLabel: row.whatsapp_label,
      whatsappUrl: row.whatsapp_url,
      email: row.contact_email,
      handle: row.contact_handle,
    },
    socialLinks: {
      tiktok: row.tiktok_url,
      instagram: row.instagram_url,
      x: row.x_url,
      facebook: row.facebook_url,
      whatsapp: row.whatsapp_social_url,
      linkedin: row.linkedin_url,
    },
  });
};

const settingsToRow = (settings: StoreSettings): StoreSettingsRow => ({
  id: 1,
  whatsapp_label: settings.contact.whatsappLabel,
  whatsapp_url: settings.contact.whatsappUrl,
  contact_email: settings.contact.email,
  contact_handle: settings.contact.handle,
  tiktok_url: settings.socialLinks.tiktok,
  instagram_url: settings.socialLinks.instagram,
  x_url: settings.socialLinks.x,
  facebook_url: settings.socialLinks.facebook,
  whatsapp_social_url: settings.socialLinks.whatsapp,
  linkedin_url: settings.socialLinks.linkedin,
});

const saveSettingsLocal = (settings: StoreSettings) => {
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
      saveSettingsLocal(defaultSettings);
      return defaultSettings;
    }

    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return defaultSettings;
  }
};

const StoreSettingsContext = createContext<StoreSettingsContextValue | null>(null);

export const StoreSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<StoreSettings>(
    isSupabaseConfigured ? defaultSettings : getInitialSettings
  );
  const [isHydrated, setIsHydrated] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let active = true;

    void (async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select(
          'id, whatsapp_label, whatsapp_url, contact_email, contact_handle, tiktok_url, instagram_url, x_url, facebook_url, whatsapp_social_url, linkedin_url'
        )
        .eq('id', 1)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        const next = normalizeSettings(defaultSettings);
        setSettingsState(next);
        await supabase
          .from('store_settings')
          .upsert(settingsToRow(next), { onConflict: 'id' });
        setIsHydrated(true);
        return;
      }

      const fromDatabase = normalizeSettingsRow(data);
      setSettingsState(fromDatabase ?? defaultSettings);
      setIsHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (isSupabaseConfigured && supabase) {
      void supabase
        .from('store_settings')
        .upsert(settingsToRow(settings), { onConflict: 'id' });
      return;
    }

    saveSettingsLocal(settings);
  }, [isHydrated, settings]);

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
