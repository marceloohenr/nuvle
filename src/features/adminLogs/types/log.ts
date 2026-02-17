export type AdminLogScope =
  | 'system'
  | 'product'
  | 'category'
  | 'stock'
  | 'order'
  | 'settings'
  | 'coupon';

export interface AdminLogEntry {
  id: string;
  createdAt: string;
  scope: AdminLogScope;
  action: string;
  description: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
}

export type AdminLogDraft = Omit<AdminLogEntry, 'id' | 'createdAt'> & {
  createdAt?: string;
};

