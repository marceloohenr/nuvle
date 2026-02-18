import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase';
import type { Coupon, ValidatedCoupon } from '../types/coupon';

const clampDiscountPercentage = (value: number) => Math.min(95, Math.max(0, value));
const clampMaxUsesPerCustomer = (value: number) => Math.max(1, Math.floor(value));

export const normalizeCouponCode = (value: string) => value.trim().toUpperCase();

const toCoupon = (row: unknown): Coupon | null => {
  if (!row || typeof row !== 'object') return null;
  const record = row as Partial<{
    code: unknown;
    description: unknown;
    discount_percentage: unknown;
    max_uses_per_customer: unknown;
    is_active: unknown;
    created_at: unknown;
  }>;

  const code = typeof record.code === 'string' ? normalizeCouponCode(record.code) : '';
  if (!code) return null;

  const description = typeof record.description === 'string' ? record.description : '';
  const discountPercentage = clampDiscountPercentage(Number(record.discount_percentage ?? 0) || 0);
  const maxUsesPerCustomer = clampMaxUsesPerCustomer(
    Number(record.max_uses_per_customer ?? 1) || 1
  );
  const isActive = typeof record.is_active === 'boolean' ? record.is_active : true;
  const createdAt =
    typeof record.created_at === 'string' && record.created_at
      ? record.created_at
      : new Date(0).toISOString();

  return { code, description, discountPercentage, maxUsesPerCustomer, isActive, createdAt };
};

export const fetchCoupons = async (): Promise<Coupon[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = await supabase
    .from('coupons')
    .select('code, description, discount_percentage, max_uses_per_customer, is_active, created_at')
    .order('created_at', { ascending: false });

  if (query.error && query.error.message.toLowerCase().includes('max_uses_per_customer')) {
    query = await supabase
      .from('coupons')
      .select('code, description, discount_percentage, is_active, created_at')
      .order('created_at', { ascending: false });
  }

  const { data, error } = query;
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => toCoupon(row)).filter((row): row is Coupon => Boolean(row));
};

export const upsertCoupon = async (draft: {
  code: string;
  description: string;
  discountPercentage: number;
  maxUsesPerCustomer: number;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase nao configurado neste ambiente.' };
  }

  const code = normalizeCouponCode(draft.code);
  if (!code) return { success: false, error: 'Informe um codigo de cupom.' };

  const discountPercentage = clampDiscountPercentage(draft.discountPercentage);
  if (!Number.isFinite(discountPercentage) || discountPercentage <= 0) {
    return { success: false, error: 'Informe um desconto valido (1 a 95%).' };
  }

  const maxUsesPerCustomer = clampMaxUsesPerCustomer(draft.maxUsesPerCustomer);
  if (!Number.isFinite(maxUsesPerCustomer) || maxUsesPerCustomer <= 0) {
    return { success: false, error: 'Informe um limite por cliente valido (minimo 1).' };
  }

  const { error } = await supabase.from('coupons').upsert(
    {
      code,
      description: draft.description.trim(),
      discount_percentage: discountPercentage,
      max_uses_per_customer: maxUsesPerCustomer,
      is_active: draft.isActive,
    },
    { onConflict: 'code' }
  );

  if (!error) return { success: true };

  if (error.message.toLowerCase().includes('max_uses_per_customer')) {
    return {
      success: false,
      error: 'Campo de limite por cliente nao encontrado. Execute novamente supabase/schema.sql.',
    };
  }

  if (error.message.includes('coupons')) {
    return {
      success: false,
      error: 'Tabela coupons nao encontrada. Execute novamente supabase/schema.sql.',
    };
  }

  return { success: false, error: error.message };
};

export const deleteCoupon = async (
  code: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase nao configurado neste ambiente.' };
  }

  const normalized = normalizeCouponCode(code);
  if (!normalized) return { success: false, error: 'Codigo invalido.' };

  const { error } = await supabase.from('coupons').delete().eq('code', normalized);
  if (!error) return { success: true };

  return { success: false, error: error.message };
};

export const validateCoupon = async (
  code: string
): Promise<{ success: boolean; coupon?: ValidatedCoupon; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Cupons indisponiveis: Supabase nao configurado.' };
  }

  const normalized = normalizeCouponCode(code);
  if (!normalized) return { success: false, error: 'Digite um codigo de cupom.' };

  const { data, error } = await supabase.rpc('validate_coupon', { p_code: normalized });
  if (error) {
    if (error.message.includes('validate_coupon')) {
      return {
        success: false,
        error: 'Funcao validate_coupon nao encontrada. Execute novamente supabase/schema.sql.',
      };
    }

    return { success: false, error: error.message };
  }

  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    return { success: false, error: 'Cupom invalido ou desativado.' };
  }

  const row = rows[0] as Partial<{
    code: unknown;
    description: unknown;
    discount_percentage: unknown;
    max_uses_per_customer: unknown;
  }>;

  const resolvedCode = typeof row.code === 'string' ? normalizeCouponCode(row.code) : normalized;
  const description = typeof row.description === 'string' ? row.description : '';
  const discountPercentage = clampDiscountPercentage(
    Number(row.discount_percentage ?? 0) || 0
  );
  const maxUsesPerCustomer = clampMaxUsesPerCustomer(
    Number(row.max_uses_per_customer ?? 1) || 1
  );

  if (!resolvedCode || discountPercentage <= 0) {
    return { success: false, error: 'Cupom invalido ou desativado.' };
  }

  return {
    success: true,
    coupon: { code: resolvedCode, description, discountPercentage, maxUsesPerCustomer },
  };
};
