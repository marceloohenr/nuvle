import { PackageSearch, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLocalOrders } from '../../features/orders';
import type { LocalOrder, OrderStatus } from '../../features/orders';

const statusTimeline: Array<{
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

const paymentLabel = {
  pix: 'PIX',
  credit: 'Cartao de credito',
  debit: 'Cartao de debito',
} as const;

const statusLabel = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Em separacao',
  shipped: 'Enviado',
  delivered: 'Entregue',
} as const;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const OrdersPage = () => {
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  useEffect(() => {
    setOrders(getLocalOrders());
  }, []);

  const hasOrders = orders.length > 0;

  const trackingCards = useMemo(
    () =>
      statusTimeline.slice(0, 4).map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Icon size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        </div>
      )),
    []
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Meus pedidos
        </p>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
          Historico do cliente
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-3">
          Pedidos finalizados no checkout agora ficam salvos localmente e aparecem
          aqui para consulta.
        </p>
      </section>

      {!hasOrders && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <PackageSearch className="text-blue-600 dark:text-blue-400" size={30} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">
            Nenhum pedido encontrado
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Finalize uma compra no checkout para preencher seu historico.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/produtos"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
            >
              Ver produtos
            </Link>
            <Link
              to="/carrinho"
              className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Ir para carrinho
            </Link>
          </div>
        </section>
      )}

      {hasOrders && (
        <section className="space-y-4">
          {orders.map((order) => {
            const activeIndex = statusTimeline.findIndex((step) => step.key === order.status);

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Pedido #{order.id}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-semibold">
                      {paymentLabel[order.paymentMethod]}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-3 py-1 text-xs font-semibold">
                      {statusLabel[order.status]}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {statusTimeline.map((step, index) => {
                    const Icon = step.icon;
                    const isDone = activeIndex >= index;
                    const isCurrent = activeIndex === index;

                    return (
                      <div
                        key={step.key}
                        className={`rounded-xl border p-3 flex items-center gap-2 ${
                          isDone
                            ? 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        <Icon
                          size={16}
                          className={
                            isDone
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        />
                        <span
                          className={`text-xs font-medium ${
                            isCurrent
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={`${order.id}-${item.id}-${item.size ?? 'no-size'}`}
                        className="flex items-center gap-3 text-sm"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Qtd: {item.quantity} {item.size ? `| Tam: ${item.size}` : ''}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {currencyFormatter.format(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        +{order.items.length - 3} item(ns) no pedido.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {currencyFormatter.format(order.total)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      Entrega para {order.customer.city} - {order.customer.state}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Etapas de rastreio da loja
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">{trackingCards}</div>
      </section>
    </div>
  );
};

export default OrdersPage;
