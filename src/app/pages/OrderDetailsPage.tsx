import { ArrowLeft, PackageSearch, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import {
  advanceLocalOrderStatus,
  canEditDeliveryAddressByStatus,
  getLocalOrderById,
  orderPaymentLabel,
  orderStatusLabel,
  orderStatusTimeline,
  removeLocalOrder,
  updateLocalOrderDeliveryAddress,
} from '../../features/orders';
import type { LocalOrder } from '../../features/orders';
import { isSupabaseConfigured } from '../../shared/lib/supabase';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const formatZipCode = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { currentUser, isAdmin, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isSavingDeliveryAddress, setIsSavingDeliveryAddress] = useState(false);
  const [deliveryAddressMessage, setDeliveryAddressMessage] = useState('');
  const [deliveryAddressForm, setDeliveryAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const refreshOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    setOrder(await getLocalOrderById(orderId));
  }, [orderId]);

  useEffect(() => {
    void refreshOrder();
  }, [refreshOrder]);

  useEffect(() => {
    if (!order) return;
    setDeliveryAddressForm({
      address: order.customer.address,
      city: order.customer.city,
      state: order.customer.state,
      zipCode: order.customer.zipCode,
    });
  }, [order]);

  const activeIndex = useMemo(() => {
    if (!order) return -1;
    return orderStatusTimeline.findIndex((step) => step.key === order.status);
  }, [order]);
  const canAccessOrder = useMemo(() => {
    if (!order || !currentUser) return false;
    if (isAdmin) return true;

    if (order.userId && order.userId === currentUser.id) return true;
    return order.customer.email.toLowerCase() === currentUser.email.toLowerCase();
  }, [order, currentUser, isAdmin]);

  if (!orderId) return <Navigate to="/pedidos" replace />;
  if (!isAuthenticated) return <Navigate to={`/login?redirect=/pedidos/${orderId}`} replace />;
  if (isRemoved) return <Navigate to="/pedidos" replace />;

  if (!order) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Pedido nao encontrado
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {isSupabaseConfigured
            ? 'O pedido informado nao existe ou voce nao tem acesso a ele.'
            : 'O pedido informado nao existe no historico local.'}
        </p>
        <Link
          to="/pedidos"
          className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar para pedidos
        </Link>
      </section>
    );
  }

  if (!canAccessOrder) {
    return <Navigate to="/pedidos" replace />;
  }

  const canAdvanceStatus = order.status !== 'delivered';
  const canEditDeliveryAddress = !isAdmin && canEditDeliveryAddressByStatus(order.status);
  const hasDeliveryAddressChanges =
    deliveryAddressForm.address.trim() !== order.customer.address.trim() ||
    deliveryAddressForm.city.trim() !== order.customer.city.trim() ||
    deliveryAddressForm.state.trim().toUpperCase() !== order.customer.state.trim().toUpperCase() ||
    deliveryAddressForm.zipCode.trim() !== order.customer.zipCode.trim();

  const isDeliveryAddressValid =
    deliveryAddressForm.address.trim().length >= 6 &&
    deliveryAddressForm.city.trim().length >= 2 &&
    deliveryAddressForm.state.trim().length >= 2 &&
    deliveryAddressForm.zipCode.trim().length >= 8;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Detalhes do pedido
            </p>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
              #{order.id}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Criado em {dateFormatter.format(new Date(order.createdAt))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-semibold">
              {orderPaymentLabel[order.paymentMethod]}
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-3 py-1 text-xs font-semibold">
              {orderStatusLabel[order.status]}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Itens do pedido
            </h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={`${order.id}-${item.id}-${item.size ?? 'no-size'}`}
                  className="flex items-center gap-3 border border-slate-200 dark:border-slate-800 rounded-xl p-3"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Qtd: {item.quantity} {item.size ? `| Tam: ${item.size}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {currencyFormatter.format(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Timeline do pedido
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {orderStatusTimeline.map((step, index) => {
                const Icon = step.icon;
                const isDone = activeIndex >= index;
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
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-fit sticky top-28 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Resumo financeiro
            </h2>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {currencyFormatter.format(order.total)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Entrega para
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{order.customer.name}</p>

            {canEditDeliveryAddress ? (
              <div className="mt-3 grid gap-2">
                <input
                  value={deliveryAddressForm.address}
                  onChange={(event) => {
                    setDeliveryAddressForm((prev) => ({ ...prev, address: event.target.value }));
                  }}
                  placeholder="Endereco completo"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={deliveryAddressForm.city}
                    onChange={(event) => {
                      setDeliveryAddressForm((prev) => ({ ...prev, city: event.target.value }));
                    }}
                    placeholder="Cidade"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <input
                    value={deliveryAddressForm.state}
                    onChange={(event) => {
                      setDeliveryAddressForm((prev) => ({
                        ...prev,
                        state: event.target.value.slice(0, 2).toUpperCase(),
                      }));
                    }}
                    placeholder="UF"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <input
                  value={deliveryAddressForm.zipCode}
                  onChange={(event) => {
                    setDeliveryAddressForm((prev) => ({
                      ...prev,
                      zipCode: formatZipCode(event.target.value),
                    }));
                  }}
                  placeholder="CEP"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  disabled={!hasDeliveryAddressChanges || !isDeliveryAddressValid || isSavingDeliveryAddress}
                  onClick={() => {
                    void (async () => {
                      setActionError('');
                      setDeliveryAddressMessage('');
                      setIsSavingDeliveryAddress(true);
                      try {
                        await updateLocalOrderDeliveryAddress(order.id, deliveryAddressForm);
                        await refreshOrder();
                        setDeliveryAddressMessage('Endereco de entrega atualizado com sucesso.');
                      } catch (error) {
                        setActionError(
                          error instanceof Error
                            ? error.message
                            : 'Nao foi possivel atualizar o endereco de entrega.'
                        );
                      } finally {
                        setIsSavingDeliveryAddress(false);
                      }
                    })();
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-semibold py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSavingDeliveryAddress ? 'Salvando...' : 'Salvar endereco de entrega'}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Endereco editavel somente enquanto o pedido nao entrou em separacao.
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-sm text-slate-600 dark:text-slate-300">{order.customer.address}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {order.customer.city} - {order.customer.state}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  CEP {order.customer.zipCode}
                </p>
                {!isAdmin && !canEditDeliveryAddressByStatus(order.status) && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Endereco bloqueado: pedido em separacao ou em etapa posterior.
                  </p>
                )}
              </div>
            )}

            {deliveryAddressMessage && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                {deliveryAddressMessage}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Link
              to="/pedidos"
              className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={14} />
              Voltar para pedidos
            </Link>

            {canAdvanceStatus && isAdmin && (
              <button
                onClick={() => {
                  void (async () => {
                    try {
                      await advanceLocalOrderStatus(order.id);
                      await refreshOrder();
                      setActionError('');
                    } catch {
                      setActionError('Nao foi possivel atualizar o status no banco.');
                    }
                  })();
                }}
                className="inline-flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-semibold py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <PackageSearch size={14} />
                Avancar status
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  void (async () => {
                    try {
                      await removeLocalOrder(order.id);
                      setIsRemoved(true);
                      setActionError('');
                    } catch {
                      setActionError('Nao foi possivel remover o pedido no banco.');
                    }
                  })();
                }}
                className="inline-flex items-center justify-center gap-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-semibold py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={14} />
                Remover pedido
              </button>
            )}
          </div>

          <button
            onClick={() => {
              void refreshOrder();
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <RotateCcw size={13} />
            Atualizar dados
          </button>

          {actionError && (
            <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
          )}
        </aside>
      </section>
    </div>
  );
};

export default OrderDetailsPage;
