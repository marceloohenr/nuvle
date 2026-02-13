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

export interface StoreContactVisibility {
  whatsapp: boolean;
  email: boolean;
  handle: boolean;
}

export type StoreSocialVisibility = Record<SocialPlatform, boolean>;

export interface StoreSettings {
  contact: StoreContactSettings;
  socialLinks: StoreSocialLinks;
  showSocialIcons: boolean;
  contactVisibility: StoreContactVisibility;
  socialVisibility: StoreSocialVisibility;
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
  show_contact_whatsapp?: boolean;
  show_contact_email?: boolean;
  show_contact_handle?: boolean;
  show_social_icons?: boolean;
  show_social_tiktok?: boolean;
  show_social_instagram?: boolean;
  show_social_x?: boolean;
  show_social_facebook?: boolean;
  show_social_whatsapp?: boolean;
  show_social_linkedin?: boolean;
  tiktok_url: string;
  instagram_url: string;
  x_url: string;
  facebook_url: string;
  whatsapp_social_url: string;
  linkedin_url: string;
}

const STORE_SETTINGS_STORAGE_KEY = 'nuvle-store-settings-v1';

const defaultSettings: StoreSettings = {
  showSocialIcons: true,
  contactVisibility: {
    whatsapp: true,
    email: true,
    handle: true,
  },
  socialVisibility: {
    tiktok: true,
    instagram: true,
    x: true,
    facebook: true,
    whatsapp: true,
    linkedin: true,
  },
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

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  return fallback;
};

const normalizeContactVisibility = (value: unknown): StoreContactVisibility => {
  if (!value || typeof value !== 'object') {
    return defaultSettings.contactVisibility;
  }

  const payload = value as Partial<StoreContactVisibility>;

  return {
    whatsapp: normalizeBoolean(payload.whatsapp, defaultSettings.contactVisibility.whatsapp),
    email: normalizeBoolean(payload.email, defaultSettings.contactVisibility.email),
    handle: normalizeBoolean(payload.handle, defaultSettings.contactVisibility.handle),
  };
};

const normalizeSocialVisibility = (value: unknown): StoreSocialVisibility => {
  if (!value || typeof value !== 'object') {
    return defaultSettings.socialVisibility;
  }

  const payload = value as Partial<Record<SocialPlatform, boolean>>;

  return {
    tiktok: normalizeBoolean(payload.tiktok, defaultSettings.socialVisibility.tiktok),
    instagram: normalizeBoolean(payload.instagram, defaultSettings.socialVisibility.instagram),
    x: normalizeBoolean(payload.x, defaultSettings.socialVisibility.x),
    facebook: normalizeBoolean(payload.facebook, defaultSettings.socialVisibility.facebook),
    whatsapp: normalizeBoolean(payload.whatsapp, defaultSettings.socialVisibility.whatsapp),
    linkedin: normalizeBoolean(payload.linkedin, defaultSettings.socialVisibility.linkedin),
  };
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
    showSocialIcons: normalizeBoolean(
      payload.showSocialIcons,
      defaultSettings.showSocialIcons
    ),
    contactVisibility: normalizeContactVisibility(payload.contactVisibility),
    socialVisibility: normalizeSocialVisibility(payload.socialVisibility),
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
    contactVisibility: {
      whatsapp: row.show_contact_whatsapp,
      email: row.show_contact_email,
      handle: row.show_contact_handle,
    },
    socialLinks: {
      tiktok: row.tiktok_url,
      instagram: row.instagram_url,
      x: row.x_url,
      facebook: row.facebook_url,
      whatsapp: row.whatsapp_social_url,
      linkedin: row.linkedin_url,
    },
    socialVisibility: {
      tiktok: row.show_social_tiktok,
      instagram: row.show_social_instagram,
      x: row.show_social_x,
      facebook: row.show_social_facebook,
      whatsapp: row.show_social_whatsapp,
      linkedin: row.show_social_linkedin,
    },
    showSocialIcons: row.show_social_icons,
  });
};

const settingsToRow = (settings: StoreSettings): StoreSettingsRow => ({
  id: 1,
  whatsapp_label: settings.contact.whatsappLabel,
  whatsapp_url: settings.contact.whatsappUrl,
  contact_email: settings.contact.email,
  contact_handle: settings.contact.handle,
  show_contact_whatsapp: settings.contactVisibility.whatsapp,
  show_contact_email: settings.contactVisibility.email,
  show_contact_handle: settings.contactVisibility.handle,
  show_social_icons: settings.showSocialIcons,
  show_social_tiktok: settings.socialVisibility.tiktok,
  show_social_instagram: settings.socialVisibility.instagram,
  show_social_x: settings.socialVisibility.x,
  show_social_facebook: settings.socialVisibility.facebook,
  show_social_whatsapp: settings.socialVisibility.whatsapp,
  show_social_linkedin: settings.socialVisibility.linkedin,
  tiktok_url: settings.socialLinks.tiktok,
  instagram_url: settings.socialLinks.instagram,
  x_url: settings.socialLinks.x,
  facebook_url: settings.socialLinks.facebook,
  whatsapp_social_url: settings.socialLinks.whatsapp,
  linkedin_url: settings.socialLinks.linkedin,
});

type StoreSettingsRowWithoutVisibility = Omit<
  StoreSettingsRow,
  | 'show_contact_whatsapp'
  | 'show_contact_email'
  | 'show_contact_handle'
  | 'show_social_tiktok'
  | 'show_social_instagram'
  | 'show_social_x'
  | 'show_social_facebook'
  | 'show_social_whatsapp'
  | 'show_social_linkedin'
>;

const settingsToRowWithoutVisibility = (
  settings: StoreSettings
): StoreSettingsRowWithoutVisibility => ({
  id: 1,
  whatsapp_label: settings.contact.whatsappLabel,
  whatsapp_url: settings.contact.whatsappUrl,
  contact_email: settings.contact.email,
  contact_handle: settings.contact.handle,
  show_social_icons: settings.showSocialIcons,
  tiktok_url: settings.socialLinks.tiktok,
  instagram_url: settings.socialLinks.instagram,
  x_url: settings.socialLinks.x,
  facebook_url: settings.socialLinks.facebook,
  whatsapp_social_url: settings.socialLinks.whatsapp,
  linkedin_url: settings.socialLinks.linkedin,
});

type StoreSettingsRowLegacy = Omit<StoreSettingsRowWithoutVisibility, 'show_social_icons'>;

const settingsToRowLegacy = (settings: StoreSettings): StoreSettingsRowLegacy => ({
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

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const isUndefinedColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const payload = error as PostgrestLikeError;
  const combined = `${payload.message ?? ''} ${payload.details ?? ''}`.toLowerCase();
  return (
    payload.code === '42703' ||
    payload.code === 'PGRST204' ||
    (combined.includes('column') && combined.includes('does not exist')) ||
    (combined.includes('schema cache') && combined.includes('column')) ||
    (combined.includes('could not find') && combined.includes('column'))
  );
};

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
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        const next = normalizeSettings(defaultSettings);
        setSettingsState(next);
        const { error: upsertError } = await supabase
          .from('store_settings')
          .upsert(settingsToRow(next), { onConflict: 'id' });

        if (upsertError && isUndefinedColumnError(upsertError)) {
          const { error: fallbackError } = await supabase
            .from('store_settings')
            .upsert(settingsToRowWithoutVisibility(next), { onConflict: 'id' });

          if (fallbackError && isUndefinedColumnError(fallbackError)) {
            await supabase
              .from('store_settings')
              .upsert(settingsToRowLegacy(next), { onConflict: 'id' });
          }
        }
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
      void (async () => {
        const { error } = await supabase
          .from('store_settings')
          .upsert(settingsToRow(settings), { onConflict: 'id' });

        if (error && isUndefinedColumnError(error)) {
          const { error: fallbackError } = await supabase
            .from('store_settings')
            .upsert(settingsToRowWithoutVisibility(settings), { onConflict: 'id' });

          if (fallbackError && isUndefinedColumnError(fallbackError)) {
            await supabase
              .from('store_settings')
              .upsert(settingsToRowLegacy(settings), { onConflict: 'id' });
          }
        }
      })();
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
        showSocialIcons: updates.showSocialIcons ?? previous.showSocialIcons,
        contact: {
          ...previous.contact,
          ...(updates.contact ?? {}),
        },
        contactVisibility: {
          ...previous.contactVisibility,
          ...(updates.contactVisibility ?? {}),
        },
        socialLinks: {
          ...previous.socialLinks,
          ...(updates.socialLinks ?? {}),
        },
        socialVisibility: {
          ...previous.socialVisibility,
          ...(updates.socialVisibility ?? {}),
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
