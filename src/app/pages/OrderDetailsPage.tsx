import { ArrowLeft, PackageSearch, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  BRAZIL_STATE_OPTIONS,
  fetchCitiesByState,
  normalizeBrazilStateCode,
} from '../../shared/lib/brazilLocations';
import {
  buildAddressLineFromZipCode,
  lookupAddressByZipCode,
  normalizeZipCodeDigits,
} from '../../shared/lib/zipCode';
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
    addressNumber: '',
    addressComplement: '',
    referencePoint: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [zipLookupMessage, setZipLookupMessage] = useState('');
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [isCityOptionsLoading, setIsCityOptionsLoading] = useState(false);
  const [cityOptionsMessage, setCityOptionsMessage] = useState('');
  const lastZipLookupRef = useRef('');

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
      addressNumber: order.customer.addressNumber ?? '',
      addressComplement: order.customer.addressComplement ?? '',
      referencePoint: order.customer.referencePoint ?? '',
      city: order.customer.city,
      state: order.customer.state,
      zipCode: order.customer.zipCode,
    });
    setZipLookupMessage('');
    setIsZipLookupLoading(false);
    lastZipLookupRef.current = '';
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
          className="mt-5 inline-flex items-center gap-2 bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-5 py-3 rounded-xl font-semibold transition-colors"
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
    deliveryAddressForm.addressNumber.trim() !== (order.customer.addressNumber ?? '').trim() ||
    deliveryAddressForm.addressComplement.trim() !==
      (order.customer.addressComplement ?? '').trim() ||
    deliveryAddressForm.referencePoint.trim() !==
      (order.customer.referencePoint ?? '').trim() ||
    deliveryAddressForm.city.trim() !== order.customer.city.trim() ||
    deliveryAddressForm.state.trim().toUpperCase() !== order.customer.state.trim().toUpperCase() ||
    deliveryAddressForm.zipCode.trim() !== order.customer.zipCode.trim();

  const isDeliveryAddressValid =
    deliveryAddressForm.address.trim().length >= 6 &&
    deliveryAddressForm.addressNumber.trim().length >= 1 &&
    deliveryAddressForm.city.trim().length >= 2 &&
    deliveryAddressForm.state.trim().length >= 2 &&
    deliveryAddressForm.zipCode.trim().length >= 8;

  const handleDeliveryZipCodeChange = (value: string) => {
    const formatted = formatZipCode(value);
    setDeliveryAddressForm((prev) => ({
      ...prev,
      zipCode: formatted,
    }));

    const normalizedZip = normalizeZipCodeDigits(formatted);
    if (normalizedZip.length !== 8) {
      lastZipLookupRef.current = '';
      setZipLookupMessage('');
      setIsZipLookupLoading(false);
      return;
    }

    if (lastZipLookupRef.current === normalizedZip) return;
    lastZipLookupRef.current = normalizedZip;
    setIsZipLookupLoading(true);
    setZipLookupMessage('Consultando CEP...');

    void (async () => {
      try {
        const lookup = await lookupAddressByZipCode(normalizedZip);
        if (!lookup) {
          setZipLookupMessage('CEP nao encontrado. Preencha endereco manualmente.');
          return;
        }

        const addressFromZip = buildAddressLineFromZipCode(lookup);
        setDeliveryAddressForm((prev) => ({
          ...prev,
          zipCode: formatZipCode(lookup.zipCode || normalizedZip),
          address: addressFromZip || prev.address,
          city: lookup.city || prev.city,
          state: lookup.state || prev.state,
        }));
        setZipLookupMessage('Endereco preenchido automaticamente pelo CEP.');
      } catch {
        setZipLookupMessage('Nao foi possivel consultar o CEP agora.');
      } finally {
        setIsZipLookupLoading(false);
      }
    })();
  };

  useEffect(() => {
    const stateCode = normalizeBrazilStateCode(deliveryAddressForm.state);
    if (!stateCode) {
      setCityOptions([]);
      setIsCityOptionsLoading(false);
      setCityOptionsMessage('');
      return;
    }

    let active = true;
    setIsCityOptionsLoading(true);
    setCityOptionsMessage('');

    void (async () => {
      const cities = await fetchCitiesByState(stateCode);
      if (!active) return;

      setCityOptions(cities);
      setIsCityOptionsLoading(false);
      if (cities.length === 0) {
        setCityOptionsMessage(
          'Nao foi possivel listar cidades agora. Voce pode preencher manualmente.'
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [deliveryAddressForm.state]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
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
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-semibold">
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
                        ? 'border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/30'
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
                  value={deliveryAddressForm.zipCode}
                  onChange={(event) => {
                    handleDeliveryZipCodeChange(event.target.value);
                  }}
                  placeholder="CEP"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <input
                  value={deliveryAddressForm.address}
                  onChange={(event) => {
                    setDeliveryAddressForm((prev) => ({ ...prev, address: event.target.value }));
                  }}
                  placeholder="Endereco completo"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <input
                  value={deliveryAddressForm.addressNumber}
                  onChange={(event) => {
                    setDeliveryAddressForm((prev) => ({
                      ...prev,
                      addressNumber: event.target.value,
                    }));
                  }}
                  placeholder="Numero"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <input
                  value={deliveryAddressForm.addressComplement}
                  onChange={(event) => {
                    setDeliveryAddressForm((prev) => ({
                      ...prev,
                      addressComplement: event.target.value,
                    }));
                  }}
                  placeholder="Complemento"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <input
                  value={deliveryAddressForm.referencePoint}
                  onChange={(event) => {
                    setDeliveryAddressForm((prev) => ({
                      ...prev,
                      referencePoint: event.target.value,
                    }));
                  }}
                  placeholder="Ponto de referencia"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={deliveryAddressForm.city}
                    onChange={(event) => {
                      setDeliveryAddressForm((prev) => ({ ...prev, city: event.target.value }));
                    }}
                    list="order-details-city-options"
                    placeholder={
                      deliveryAddressForm.state
                        ? 'Cidade'
                        : 'Selecione o estado para listar cidades'
                    }
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <select
                    value={deliveryAddressForm.state}
                    onChange={(event) => {
                      const nextState = normalizeBrazilStateCode(event.target.value);
                      setDeliveryAddressForm((prev) => ({
                        ...prev,
                        state: nextState,
                        city: prev.state === nextState ? prev.city : '',
                      }));
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Estado (UF)</option>
                    {BRAZIL_STATE_OPTIONS.map((stateOption) => (
                      <option key={stateOption.code} value={stateOption.code}>
                        {stateOption.code} - {stateOption.name}
                      </option>
                    ))}
                  </select>
                </div>
                <datalist id="order-details-city-options">
                  {cityOptions.map((cityOption) => (
                    <option key={cityOption} value={cityOption} />
                  ))}
                </datalist>
                {(zipLookupMessage || isZipLookupLoading) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isZipLookupLoading ? 'Consultando CEP...' : zipLookupMessage}
                  </p>
                )}
                {(isCityOptionsLoading || cityOptionsMessage) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isCityOptionsLoading ? 'Carregando cidades...' : cityOptionsMessage}
                  </p>
                )}
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
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-900 text-slate-700 dark:text-slate-300 font-semibold py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSavingDeliveryAddress ? 'Salvando...' : 'Salvar endereco de entrega'}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Endereco editavel somente enquanto o pedido nao entrou em separacao.
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {order.customer.address}, {order.customer.addressNumber || 's/n'}
                </p>
                {order.customer.addressComplement && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Complemento: {order.customer.addressComplement}
                  </p>
                )}
                {order.customer.referencePoint && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Referencia: {order.customer.referencePoint}
                  </p>
                )}
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
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
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
                className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-900 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors"
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
                className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-400 font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors"
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
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            <RotateCcw size={13} />
            Atualizar dados
          </button>

          {actionError && (
            <p className="text-xs text-slate-600 dark:text-slate-400">{actionError}</p>
          )}
        </aside>
      </section>
    </div>
  );
};

export default OrderDetailsPage;
