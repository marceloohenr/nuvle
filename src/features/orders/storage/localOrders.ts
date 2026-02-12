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

const sortByDateDesc = (orders: LocalOrder[]) =>
  [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const saveOrders = (orders: LocalOrder[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(sortByDateDesc(orders)));
};

export const getLocalOrders = (): LocalOrder[] => {
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

export const getLocalOrderById = (orderId: string): LocalOrder | null => {
  const orders = getLocalOrders();
  return orders.find((order) => order.id === orderId) ?? null;
};

export const addLocalOrder = (order: LocalOrder) => {
  const currentOrders = getLocalOrders();
  saveOrders([order, ...currentOrders]);
};

export const updateLocalOrderStatus = (orderId: string, status: OrderStatus) => {
  const currentOrders = getLocalOrders();
  const nextOrders = currentOrders.map((order) =>
    order.id === orderId ? { ...order, status } : order
  );
  saveOrders(nextOrders);
};

export const advanceLocalOrderStatus = (orderId: string): OrderStatus | null => {
  const targetOrder = getLocalOrderById(orderId);
  if (!targetOrder) return null;

  const nextStatus = statusProgression[targetOrder.status];
  updateLocalOrderStatus(orderId, nextStatus);
  return nextStatus;
};

export const removeLocalOrder = (orderId: string) => {
  const currentOrders = getLocalOrders();
  const nextOrders = currentOrders.filter((order) => order.id !== orderId);
  saveOrders(nextOrders);
};

export const clearLocalOrders = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORDERS_STORAGE_KEY);
};
