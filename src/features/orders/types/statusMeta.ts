import { PackageSearch, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { OrderPaymentMethod, OrderStatus } from './order';

export const orderStatusTimeline: Array<{
  key: OrderStatus;
  label: string;
  icon: typeof ShieldCheck;
}> = [
  { key: 'pending_payment', label: 'Aguardando pagamento', icon: ShieldCheck },
  { key: 'paid', label: 'Pago e aprovado', icon: ShoppingBag },
  { key: 'preparing', label: 'Em separacao', icon: PackageSearch },
  { key: 'shipped', label: 'Enviado', icon: Truck },
  { key: 'delivered', label: 'Entregue', icon: ShieldCheck },
];

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Em separacao',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

export const orderPaymentLabel: Record<OrderPaymentMethod, string> = {
  pix: 'PIX',
  credit: 'Cartao de credito',
  debit: 'Cartao de debito',
};
