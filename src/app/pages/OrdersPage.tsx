import { PackageSearch, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import {
  advanceLocalOrderStatus,
  clearLocalOrders,
  getLocalOrders,
  orderPaymentLabel,
  orderStatusLabel,
  orderStatusTimeline,
  removeLocalOrder,
} from '../../features/orders';
import type { LocalOrder, OrderStatus } from '../../features/orders';
import { isSupabaseConfigured } from '../../shared/lib/supabase';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const statusFilterOptions: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending_payment', label: orderStatusLabel.pending_payment },
  { value: 'paid', label: orderStatusLabel.paid },
  { value: 'preparing', label: orderStatusLabel.preparing },
  { value: 'shipped', label: orderStatusLabel.shipped },
  { value: 'delivered', label: orderStatusLabel.delivered },
];

const canAccessOrder = (
  order: LocalOrder,
  currentUserId: string | undefined,
  currentUserEmail: string | undefined,
  isAdmin: boolean
) => {
  if (isAdmin) return true;
  if (!currentUserId && !currentUserEmail) return false;
  if (order.userId && currentUserId && order.userId === currentUserId) return true;
  return order.customer.email.toLowerCase() === (currentUserEmail ?? '').toLowerCase();
};

const OrdersPage = () => {
  const { currentUser, isAdmin, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [actionError, setActionError] = useState('');

  const refreshOrders = useCallback(async () => {
    const allOrders = await getLocalOrders();
    const visibleOrders = allOrders.filter((order) =>
      canAccessOrder(order, currentUser?.id, currentUser?.email, isAdmin)
    );
    setOrders(visibleOrders);
  }, [currentUser?.email, currentUser?.id, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshOrders();
  }, [isAuthenticated, refreshOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        order.customer.name.toLowerCase().includes(normalizedSearch) ||
        order.customer.city.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const hasOrders = orders.length > 0;
  const hasResults = filteredOrders.length > 0;
  const canClearHistory = isAdmin || !isSupabaseConfigured;

  const handleAdvanceStatus = async (orderId: string) => {
    const targetOrder = orders.find((order) => order.id === orderId);
    if (!targetOrder) return;

    try {
      await advanceLocalOrderStatus(orderId);
      await refreshOrders();
      setActionError('');
    } catch {
      setActionError('Nao foi possivel atualizar o status do pedido no banco.');
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    const targetOrder = orders.find((order) => order.id === orderId);
    if (!targetOrder) return;

    try {
      await removeLocalOrder(orderId);
      await refreshOrders();
      setActionError('');
    } catch {
      setActionError('Nao foi possivel remover o pedido no banco.');
    }
  };

  const handleClearOrders = async () => {
    if (!canClearHistory) {
      setActionError(
        'No modo banco, clientes nao podem apagar historico de pedidos.'
      );
      return;
    }

    if (isAdmin) {
      try {
        await clearLocalOrders();
        await refreshOrders();
        setActionError('');
      } catch {
        setActionError('Nao foi possivel limpar o historico no banco.');
      }
      return;
    }

    try {
      await Promise.all(orders.map((order) => removeLocalOrder(order.id)));
      await refreshOrders();
      setActionError('');
    } catch {
      setActionError('Nao foi possivel limpar o historico no banco.');
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-black p-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Faca login para acompanhar seus pedidos
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Sua conta permite ver historico completo e status de entrega.
        </p>
        <Link
          to="/login?redirect=/pedidos"
          className="mt-5 inline-flex items-center justify-center bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          Ir para login
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-8 md:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              {isAdmin ? 'Painel administrativo' : 'Meus pedidos'}
            </p>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
              {isAdmin ? 'Todos os pedidos da loja' : 'Historico do cliente'}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3">
              {isAdmin
                ? 'Acompanhe pedidos, dados de entrega e atualize status do fluxo logistico.'
                : 'Seus pedidos finalizados no checkout ficam salvos e podem ser acompanhados por status.'}
            </p>
          </div>

          {hasOrders && canClearHistory && (
            <button
              onClick={() => {
                void handleClearOrders();
              }}
              className="inline-flex items-center justify-center gap-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={15} />
              Limpar historico
            </button>
          )}
        </div>
      </section>

      {actionError && (
        <section className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
          {actionError}
        </section>
      )}

      {!hasOrders && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <PackageSearch className="text-slate-600 dark:text-slate-400" size={30} />
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
              className="inline-flex items-center justify-center bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-5 py-3 rounded-xl font-semibold transition-colors"
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
        <>
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_260px]">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por numero, nome ou cidade"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black px-3 py-3 text-slate-800 dark:text-slate-100"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black px-3 py-3 text-slate-800 dark:text-slate-100"
              >
                {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
                ))}
              </select>
            </div>
          </section>

          {!hasResults && (
            <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-black p-8 text-center">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Nenhum resultado com esses filtros
              </h2>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="mt-4 inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold hover:underline"
              >
                <RotateCcw size={14} />
                Limpar filtros
              </button>
            </section>
          )}

          {hasResults && (
            <section className="space-y-4">
              {filteredOrders.map((order) => {
                const activeIndex = orderStatusTimeline.findIndex(
                  (step) => step.key === order.status
                );
                const canAdvance = order.status !== 'delivered';

                return (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6"
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
                          {orderPaymentLabel[order.paymentMethod]}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-black/50 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-semibold">
                          {orderStatusLabel[order.status]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {orderStatusTimeline.map((step, index) => {
                        const Icon = step.icon;
                        const isDone = activeIndex >= index;
                        const isCurrent = activeIndex === index;

                        return (
                          <div
                            key={step.key}
                            className={`rounded-xl border p-3 flex items-center gap-2 ${
                              isDone
                                ? 'border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-black/30'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                            }`}
                          >
                            <Icon
                              size={16}
                              className={
                                isDone
                                  ? 'text-slate-600 dark:text-slate-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }
                            />
                            <span
                              className={`text-xs font-medium ${
                                isCurrent
                                  ? 'text-slate-700 dark:text-slate-300'
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

                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
                      <p>
                        Cliente: <strong>{order.customer.name}</strong> ({order.customer.email})
                      </p>
                      <p>
                        Telefone: {order.customer.phone} | CPF: {order.customer.cpf}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        to={`/pedidos/${order.id}`}
                        className="inline-flex items-center justify-center bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        Ver detalhes
                      </Link>
                      {canAdvance && isAdmin && (
                        <button
                          onClick={() => {
                            void handleAdvanceStatus(order.id);
                          }}
                          className="inline-flex items-center justify-center border border-slate-200 dark:border-slate-900 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors"
                        >
                          Avancar status
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            void handleRemoveOrder(order.id);
                          }}
                          className="inline-flex items-center justify-center border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 md:p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Etapas de rastreio da loja
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {orderStatusTimeline.slice(0, 4).map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <Icon size={18} className="text-slate-600 dark:text-slate-400" />
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OrdersPage;
