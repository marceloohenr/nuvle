import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase';
import type { CustomerProfile } from '../types/profile';

const CUSTOMER_PROFILE_STORAGE_KEY = 'nuvle-customer-profiles-v1';

const emptyProfile: CustomerProfile = {
  phone: '',
  cpf: '',
  address: '',
  addressNumber: '',
  addressComplement: '',
  referencePoint: '',
  city: '',
  state: '',
  zipCode: '',
};

interface ProfileRow {
  phone: string | null;
  cpf: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  reference_point: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

type StoredProfilesMap = Record<string, CustomerProfile>;

const normalizeProfile = (profile: Partial<CustomerProfile> | null | undefined): CustomerProfile => {
  if (!profile) return { ...emptyProfile };

  return {
    phone: String(profile.phone ?? '').trim(),
    cpf: String(profile.cpf ?? '').trim(),
    address: String(profile.address ?? '').trim(),
    addressNumber: String(profile.addressNumber ?? '').trim(),
    addressComplement: String(profile.addressComplement ?? '').trim(),
    referencePoint: String(profile.referencePoint ?? '').trim(),
    city: String(profile.city ?? '').trim(),
    state: String(profile.state ?? '').trim().toUpperCase(),
    zipCode: String(profile.zipCode ?? '').trim(),
  };
};

const normalizeProfileRow = (value: unknown): CustomerProfile | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<ProfileRow>;

  return normalizeProfile({
    phone: row.phone ?? '',
    cpf: row.cpf ?? '',
    address: row.address ?? '',
    addressNumber: row.address_number ?? '',
    addressComplement: row.address_complement ?? '',
    referencePoint: row.reference_point ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zipCode: row.zip_code ?? '',
  });
};

const toFriendlyProfileError = (message: string) => {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('column') &&
    (normalized.includes('phone') ||
      normalized.includes('cpf') ||
      normalized.includes('address') ||
      normalized.includes('address_number') ||
      normalized.includes('address_complement') ||
      normalized.includes('reference_point') ||
      normalized.includes('zip_code'))
  ) {
    return 'Campos de endereco da conta ainda nao existem no banco. Execute o schema.sql atualizado.';
  }

  return message;
};

const getStoredProfilesMap = (): StoredProfilesMap => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const nextMap: StoredProfilesMap = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([userId, value]) => {
      nextMap[userId] = normalizeProfile(value as Partial<CustomerProfile>);
    });

    return nextMap;
  } catch {
    return {};
  }
};

const saveStoredProfilesMap = (profilesMap: StoredProfilesMap) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(profilesMap));
};

const getLocalCustomerProfile = (userId: string): CustomerProfile => {
  const profilesMap = getStoredProfilesMap();
  return profilesMap[userId] ? normalizeProfile(profilesMap[userId]) : { ...emptyProfile };
};

const saveLocalCustomerProfile = (userId: string, profile: CustomerProfile): CustomerProfile => {
  const profilesMap = getStoredProfilesMap();
  const normalized = normalizeProfile(profile);
  profilesMap[userId] = normalized;
  saveStoredProfilesMap(profilesMap);
  return normalized;
};

export const getCustomerProfile = async (userId: string): Promise<CustomerProfile> => {
  if (!userId) return { ...emptyProfile };

  if (isSupabaseConfigured && supabase) {
    let query = await supabase
      .from('profiles')
      .select(
        'phone, cpf, address, address_number, address_complement, reference_point, city, state, zip_code'
      )
      .eq('id', userId)
      .maybeSingle();

    if (query.error && toFriendlyProfileError(query.error.message).includes('schema.sql')) {
      query = await supabase
        .from('profiles')
        .select('phone, cpf, address, city, state, zip_code')
        .eq('id', userId)
        .maybeSingle();
    }

    const { data, error } = query;
    if (!error) {
      const profile = normalizeProfileRow(data);
      if (profile) return profile;
    }
  }

  return getLocalCustomerProfile(userId);
};

export const upsertCustomerProfile = async (
  userId: string,
  profile: CustomerProfile
): Promise<CustomerProfile> => {
  const normalized = normalizeProfile(profile);
  if (!userId) return normalized;

  if (isSupabaseConfigured && supabase) {
    let query = await supabase
      .from('profiles')
      .update({
        phone: normalized.phone,
        cpf: normalized.cpf,
        address: normalized.address,
        address_number: normalized.addressNumber,
        address_complement: normalized.addressComplement,
        reference_point: normalized.referencePoint,
        city: normalized.city,
        state: normalized.state,
        zip_code: normalized.zipCode,
      })
      .eq('id', userId)
      .select(
        'phone, cpf, address, address_number, address_complement, reference_point, city, state, zip_code'
      )
      .maybeSingle();

    if (query.error && toFriendlyProfileError(query.error.message).includes('schema.sql')) {
      query = await supabase
        .from('profiles')
        .update({
          phone: normalized.phone,
          cpf: normalized.cpf,
          address: normalized.address,
          city: normalized.city,
          state: normalized.state,
          zip_code: normalized.zipCode,
        })
        .eq('id', userId)
        .select('phone, cpf, address, city, state, zip_code')
        .maybeSingle();
    }

    const { data, error } = query;

    if (error) {
      throw new Error(toFriendlyProfileError(error.message));
    }

    const saved = normalizeProfileRow(data);
    if (saved) return saved;
  }

  return saveLocalCustomerProfile(userId, normalized);
};
