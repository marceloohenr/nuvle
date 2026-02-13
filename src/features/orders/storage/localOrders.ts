import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase';
import {
  LocalOrder,
  LocalOrderCustomer,
  LocalOrderItem,
  OrderPaymentMethod,
  OrderStatus,
} from '../types/order';

const ORDERS_STORAGE_KEY = 'nuvle-orders-v1';
const validStatuses: ReadonlyArray<OrderStatus> = [
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
];

const validPayments: ReadonlyArray<OrderPaymentMethod> = ['pix', 'credit', 'debit'];

const statusProgression: Record<OrderStatus, OrderStatus> = {
  pending_payment: 'paid',
  paid: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered',
  delivered: 'delivered',
};

interface OrderItemRow {
  product_id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  size: string | null;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  created_at: string;
  status: OrderStatus;
  payment_method: OrderPaymentMethod;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip_code: string;
  order_items?: OrderItemRow[];
}

const normalizeOrderItem = (value: unknown): LocalOrderItem | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<LocalOrderItem>;
  if (!item.id || !item.name || !item.image || typeof item.price !== 'number') return null;

  return {
    id: String(item.id),
    name: String(item.name),
    image: String(item.image),
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: Number(item.price),
    size: item.size ? String(item.size) : undefined,
  };
};

const normalizeCustomer = (value: unknown): LocalOrderCustomer | null => {
  if (!value || typeof value !== 'object') return null;
  const customer = value as Partial<LocalOrderCustomer>;

  const requiredFields = [
    customer.name,
    customer.email,
    customer.phone,
    customer.cpf,
    customer.address,
    customer.city,
    customer.state,
    customer.zipCode,
  ];

  if (requiredFields.some((field) => typeof field !== 'string')) return null;

  return {
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    cpf: customer.cpf ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
    zipCode: customer.zipCode ?? '',
  };
};

const normalizeOrder = (value: unknown): LocalOrder | null => {
  if (!value || typeof value !== 'object') return null;
  const order = value as Partial<LocalOrder>;

  if (
    !order.id ||
    !order.createdAt ||
    typeof order.total !== 'number' ||
    !order.status ||
    !order.paymentMethod ||
    !Array.isArray(order.items)
  ) {
    return null;
  }

  if (!validStatuses.includes(order.status)) return null;
  if (!validPayments.includes(order.paymentMethod)) return null;

  const items = order.items
    .map((item) => normalizeOrderItem(item))
    .filter((item): item is LocalOrderItem => Boolean(item));
  const customer = normalizeCustomer(order.customer);

  if (!customer || items.length === 0) return null;

  return {
    id: String(order.id),
    userId: order.userId ? String(order.userId) : undefined,
    createdAt: String(order.createdAt),
    total: Number(order.total),
    status: order.status,
    paymentMethod: order.paymentMethod,
    items,
    customer,
  };
};

const normalizeOrderRow = (value: unknown): OrderRow | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<OrderRow>;

  const requiredStringFields: Array<unknown> = [
    row.id,
    row.created_at,
    row.customer_name,
    row.customer_email,
    row.customer_phone,
    row.customer_cpf,
    row.customer_address,
    row.customer_city,
    row.customer_state,
    row.customer_zip_code,
  ];

  if (requiredStringFields.some((field) => typeof field !== 'string')) return null;
  if (typeof row.total !== 'number') return null;
  if (!row.status || !validStatuses.includes(row.status)) return null;
  if (!row.payment_method || !validPayments.includes(row.payment_method)) return null;

  const items = Array.isArray(row.order_items)
    ? row.order_items
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const entry = item as Partial<OrderItemRow>;

          if (
            !entry.product_id ||
            !entry.name ||
            !entry.image ||
            typeof entry.quantity !== 'number' ||
            typeof entry.price !== 'number'
          ) {
            return null;
          }

          return {
            product_id: String(entry.product_id),
            name: String(entry.name),
            image: String(entry.image),
            quantity: Number(entry.quantity),
            price: Number(entry.price),
            size: entry.size ? String(entry.size) : null,
          } satisfies OrderItemRow;
        })
        .filter((item): item is OrderItemRow => Boolean(item))
    : [];

  return {
    id: String(row.id),
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    created_at: String(row.created_at),
    status: row.status,
    payment_method: row.payment_method,
    total: Number(row.total),
    customer_name: String(row.customer_name),
    customer_email: String(row.customer_email),
    customer_phone: String(row.customer_phone),
    customer_cpf: String(row.customer_cpf),
    customer_address: String(row.customer_address),
    customer_city: String(row.customer_city),
    customer_state: String(row.customer_state),
    customer_zip_code: String(row.customer_zip_code),
    order_items: items,
  };
};

const mapRowToLocalOrder = (row: OrderRow): LocalOrder => {
  const items = (row.order_items ?? []).map((item) => ({
    id: item.product_id,
    name: item.name,
    image: item.image,
    quantity: item.quantity,
    price: item.price,
    size: item.size ?? undefined,
  }));

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    createdAt: row.created_at,
    status: row.status,
    paymentMethod: row.payment_method,
    total: row.total,
    items,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      cpf: row.customer_cpf,
      address: row.customer_address,
      city: row.customer_city,
      state: row.customer_state,
      zipCode: row.customer_zip_code,
    },
  };
};

const sortByDateDesc = (orders: LocalOrder[]) =>
  [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const saveOrdersLocal = (orders: LocalOrder[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(sortByDateDesc(orders)));
};

const getOrdersLocal = (): LocalOrder[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortByDateDesc(
      parsed
        .map((entry) => normalizeOrder(entry))
        .filter((entry): entry is LocalOrder => Boolean(entry))
    );
  } catch {
    return [];
  }
};

const getOrdersSupabase = async (): Promise<LocalOrder[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, user_id, created_at, status, payment_method, total, customer_name, customer_email, customer_phone, customer_cpf, customer_address, customer_city, customer_state, customer_zip_code, order_items (product_id, name, image, quantity, price, size)'
    )
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((entry) => normalizeOrderRow(entry))
    .filter((entry): entry is OrderRow => Boolean(entry))
    .map((entry) => mapRowToLocalOrder(entry));
};

export const getLocalOrders = async (): Promise<LocalOrder[]> => {
  if (isSupabaseConfigured) {
    return getOrdersSupabase();
  }

  return getOrdersLocal();
};

export const getLocalOrderById = async (orderId: string): Promise<LocalOrder | null> => {
  const orders = await getLocalOrders();
  return orders.find((order) => order.id === orderId) ?? null;
};

export const addLocalOrder = async (order: LocalOrder) => {
  if (isSupabaseConfigured && supabase) {
    const { error: orderError } = await supabase.from('orders').insert({
      id: order.id,
      user_id: order.userId ?? null,
      created_at: order.createdAt,
      status: order.status,
      payment_method: order.paymentMethod,
      total: order.total,
      customer_name: order.customer.name,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone,
      customer_cpf: order.customer.cpf,
      customer_address: order.customer.address,
      customer_city: order.customer.city,
      customer_state: order.customer.state,
      customer_zip_code: order.customer.zipCode,
    });

    if (orderError) {
      throw new Error(orderError.message);
    }

    const itemsPayload = order.items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      price: item.price,
      size: item.size ?? null,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return;
  }

  const currentOrders = getOrdersLocal();
  saveOrdersLocal([order, ...currentOrders]);
};

export const updateLocalOrderStatus = async (orderId: string, status: OrderStatus) => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const currentOrders = getOrdersLocal();
  const nextOrders = currentOrders.map((order) =>
    order.id === orderId ? { ...order, status } : order
  );
  saveOrdersLocal(nextOrders);
};

export const advanceLocalOrderStatus = async (orderId: string): Promise<OrderStatus | null> => {
  const targetOrder = await getLocalOrderById(orderId);
  if (!targetOrder) return null;

  const nextStatus = statusProgression[targetOrder.status];
  await updateLocalOrderStatus(orderId, nextStatus);
  return nextStatus;
};

export const removeLocalOrder = async (orderId: string) => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('orders').delete().eq('id', orderId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const currentOrders = getOrdersLocal();
  const nextOrders = currentOrders.filter((order) => order.id !== orderId);
  saveOrdersLocal(nextOrders);
};

export const clearLocalOrders = async () => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('orders').delete().neq('id', '');

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORDERS_STORAGE_KEY);
};
