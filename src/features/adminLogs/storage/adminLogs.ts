import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase';
import type { AdminLogDraft, AdminLogEntry } from '../types/log';

const ADMIN_LOGS_STORAGE_KEY = 'nuvle-admin-logs-v1';
const MAX_LOCAL_LOGS = 500;

const buildLogId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeString = (value: unknown) => (typeof value === 'string' ? value : '');

const normalizeMetadata = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const normalizeLogEntry = (value: unknown): AdminLogEntry | null => {
  if (!value || typeof value !== 'object') return null;

  const row = value as Partial<{
    id: unknown;
    createdAt: unknown;
    created_at: unknown;
    scope: unknown;
    action: unknown;
    description: unknown;
    actorId: unknown;
    actor_id: unknown;
    actorName: unknown;
    actor_name: unknown;
    actorEmail: unknown;
    actor_email: unknown;
    metadata: unknown;
  }>;

  const id = normalizeString(row.id);
  const createdAt = normalizeString(row.createdAt) || normalizeString(row.created_at);
  const scope = normalizeString(row.scope);
  const action = normalizeString(row.action);
  const description = normalizeString(row.description);

  if (!id || !createdAt || !scope || !action || !description) return null;

  return {
    id,
    createdAt,
    scope: scope as AdminLogEntry['scope'],
    action,
    description,
    actorId: normalizeString(row.actorId) || normalizeString(row.actor_id) || undefined,
    actorName: normalizeString(row.actorName) || normalizeString(row.actor_name) || undefined,
    actorEmail: normalizeString(row.actorEmail) || normalizeString(row.actor_email) || undefined,
    metadata: normalizeMetadata(row.metadata),
  };
};

const sortLogsByDateDesc = (logs: AdminLogEntry[]) =>
  [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const readLocalLogs = (): AdminLogEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(ADMIN_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortLogsByDateDesc(
      parsed
        .map((entry) => normalizeLogEntry(entry))
        .filter((entry): entry is AdminLogEntry => Boolean(entry))
    );
  } catch {
    return [];
  }
};

const saveLocalLogs = (logs: AdminLogEntry[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      ADMIN_LOGS_STORAGE_KEY,
      JSON.stringify(sortLogsByDateDesc(logs).slice(0, MAX_LOCAL_LOGS))
    );
  } catch {
    // Ignore local storage failures.
  }
};

const isMissingAdminLogsSchema = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const payload = error as { message?: string; details?: string; code?: string };
  const combined = `${payload.message ?? ''} ${payload.details ?? ''}`.toLowerCase();

  return (
    payload.code === '42P01' ||
    payload.code === 'PGRST204' ||
    (combined.includes('admin_logs') &&
      (combined.includes('relation') ||
        combined.includes('schema cache') ||
        combined.includes('could not find') ||
        combined.includes('column')))
  );
};

export const getAdminLogs = async (limit = 250): Promise<AdminLogEntry[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('admin_logs')
      .select(
        'id, created_at, scope, action, description, actor_id, actor_name, actor_email, metadata'
      )
      .order('created_at', { ascending: false })
      .limit(Math.max(1, limit));

    if (!error && Array.isArray(data)) {
      return data
        .map((entry) => normalizeLogEntry(entry))
        .filter((entry): entry is AdminLogEntry => Boolean(entry));
    }

    if (!isMissingAdminLogsSchema(error)) {
      return readLocalLogs().slice(0, Math.max(1, limit));
    }
  }

  return readLocalLogs().slice(0, Math.max(1, limit));
};

export const addAdminLog = async (draft: AdminLogDraft): Promise<void> => {
  const entry: AdminLogEntry = {
    id: buildLogId(),
    createdAt: draft.createdAt ?? new Date().toISOString(),
    scope: draft.scope,
    action: draft.action.trim(),
    description: draft.description.trim(),
    actorId: draft.actorId?.trim() || undefined,
    actorName: draft.actorName?.trim() || undefined,
    actorEmail: draft.actorEmail?.trim() || undefined,
    metadata: draft.metadata,
  };

  if (!entry.action || !entry.description) return;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('admin_logs').insert({
      id: entry.id,
      created_at: entry.createdAt,
      scope: entry.scope,
      action: entry.action,
      description: entry.description,
      actor_id: entry.actorId ?? null,
      actor_name: entry.actorName ?? null,
      actor_email: entry.actorEmail ?? null,
      metadata: entry.metadata ?? {},
    });

    if (!error) return;
    if (!isMissingAdminLogsSchema(error)) {
      // Keep a local fallback when the insert fails for any reason.
      const current = readLocalLogs();
      saveLocalLogs([entry, ...current]);
      return;
    }
  }

  const current = readLocalLogs();
  saveLocalLogs([entry, ...current]);
};

export const clearAdminLogs = async (): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('admin_logs').delete().neq('id', '');
    if (!error) return;
  }

  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_LOGS_STORAGE_KEY);
};

