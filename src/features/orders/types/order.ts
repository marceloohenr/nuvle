export type OrderPaymentMethod = 'pix' | 'credit' | 'debit';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered';

export interface LocalOrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  size?: string;
}

export interface LocalOrderCustomer {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface LocalOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  total: number;
  items: LocalOrderItem[];
  customer: LocalOrderCustomer;
}
