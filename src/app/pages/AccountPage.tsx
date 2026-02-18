import { CreditCard, Heart, LogOut, MapPin, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { getCustomerProfile, upsertCustomerProfile } from '../../features/customerProfile';
import type { CustomerProfile } from '../../features/customerProfile';
import { useFavorites } from '../../features/favorites';
import { getLocalOrders, orderStatusLabel } from '../../features/orders';
import type { LocalOrder } from '../../features/orders';
import { useToast } from '../../shared/providers';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const accountBlocks = [
  {
    title: 'Dados pessoais',
    description: 'Nome e e-mail da conta autenticada.',
    icon: UserCircle2,
  },
  {
    title: 'Enderecos',
    description: 'Endereco principal salvo para agilizar futuros checkouts.',
    icon: MapPin,
  },
  {
    title: 'Pagamentos',
    description: 'Historico de metodos usados no checkout.',
    icon: CreditCard,
  },
  {
    title: 'Seguranca',
    description: 'Sessao da conta autenticada neste dispositivo.',
    icon: ShieldCheck,
  },
];

const canAccessOrder = (order: LocalOrder, userId: string, email: string) => {
  if (order.userId && order.userId === userId) return true;
  return order.customer.email.toLowerCase() === email.toLowerCase();
};

const initialProfileForm: CustomerProfile = {
  phone: '',
  cpf: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatZipCode = (value: string) => {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const AccountPage = () => {
  const { currentUser, isAdmin, isAuthenticated, logout } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const { showToast } = useToast();
  const location = useLocation();
  const [userOrders, setUserOrders] = useState<LocalOrder[]>([]);
  const [isOrdersLoaded, setIsOrdersLoaded] = useState(false);
  const [profileForm, setProfileForm] = useState<CustomerProfile>(initialProfileForm);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser || isAdmin) {
      setUserOrders([]);
      setIsOrdersLoaded(true);
      return;
    }

    let active = true;
    setIsOrdersLoaded(false);

    void (async () => {
      try {
        const allOrders = await getLocalOrders();
        if (!active) return;

        setUserOrders(
          allOrders.filter((order) => canAccessOrder(order, currentUser.id, currentUser.email))
        );
      } finally {
        if (active) {
          setIsOrdersLoaded(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser, isAdmin]);

  useEffect(() => {
    setIsProfileLoaded(false);
    setProfileError('');
  }, [currentUser?.id, isAdmin]);

  useEffect(() => {
    if (!currentUser || isAdmin || isProfileLoaded || !isOrdersLoaded) return;

    let active = true;
    void (async () => {
      try {
        const savedProfile = await getCustomerProfile(currentUser.id);
        if (!active) return;

        const lastOrder = userOrders[0]?.customer;
        setProfileForm({
          phone: savedProfile.phone || lastOrder?.phone || '',
          cpf: savedProfile.cpf || lastOrder?.cpf || '',
          address: savedProfile.address || lastOrder?.address || '',
          city: savedProfile.city || lastOrder?.city || '',
          state: savedProfile.state || lastOrder?.state || '',
          zipCode: savedProfile.zipCode || lastOrder?.zipCode || '',
        });
        setProfileError('');
      } catch (error) {
        if (!active) return;
        setProfileError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o endereco salvo da conta.'
        );
      } finally {
        if (active) {
          setIsProfileLoaded(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser, isAdmin, isOrdersLoaded, isProfileLoaded, userOrders]);

  useEffect(() => {
    if (location.hash !== '#favoritos') return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const target = document.getElementById('favoritos');
    if (!target) return;

    const raf = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [location.hash]);

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login?redirect=/conta" replace />;
  }

  if (isAdmin) {
    return (
      <section className="max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Conta administrativa
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
            Bem-vindo, {currentUser.name}
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Esta conta possui acesso total ao painel de gerenciamento da loja.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Abrir painel admin
          </Link>
          <Link
            to="/pedidos"
            className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Ver pedidos
          </Link>
          <button
            onClick={() => {
              void logout();
            }}
            className="inline-flex items-center justify-center gap-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-5 py-3 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={15} />
            Sair da conta
          </button>
        </div>
      </section>
    );
  }

  const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);
  const lastOrder = userOrders[0] ?? null;
  const addressFromProfile = profileForm.address
    ? `${profileForm.address}, ${profileForm.city} - ${profileForm.state}`
    : 'Nenhum endereco principal cadastrado';
  const isProfileFormValid =
    profileForm.address.trim().length >= 6 &&
    profileForm.city.trim().length >= 2 &&
    profileForm.state.trim().length >= 2 &&
    digitsOnly(profileForm.zipCode).length === 8;

  const handleProfileInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'cpf') nextValue = formatCpf(value);
    if (name === 'phone') nextValue = formatPhone(value);
    if (name === 'zipCode') nextValue = formatZipCode(value);
    if (name === 'state') nextValue = value.slice(0, 2).toUpperCase();

    setProfileForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;

    if (!isProfileFormValid) {
      setProfileError('Preencha endereco, cidade, estado e CEP validos para salvar.');
      return;
    }

    setProfileError('');
    setIsSavingProfile(true);

    void (async () => {
      try {
        const savedProfile = await upsertCustomerProfile(currentUser.id, profileForm);
        setProfileForm(savedProfile);
        showToast('Endereco principal salvo na sua conta.', { variant: 'success' });
      } catch (error) {
        setProfileError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel salvar o endereco principal.'
        );
      } finally {
        setIsSavingProfile(false);
      }
    })();
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Minha conta
        </p>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
          Ola, {currentUser.name}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-3 max-w-3xl">
          Sua conta esta ativa com historico de pedidos e acompanhamento de status.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/pedidos"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Ver meus pedidos
          </Link>
          <button
            onClick={() => {
              void logout();
            }}
            className="inline-flex items-center justify-center gap-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-5 py-3 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={15} />
            Sair da conta
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
            E-mail
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white break-all">
            {currentUser.email}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Pedidos
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{userOrders.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Total gasto
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {currencyFormatter.format(totalSpent)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Ultimo status
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
            {lastOrder ? orderStatusLabel[lastOrder.status] : 'Sem pedidos'}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {accountBlocks.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
          >
            <Icon className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">{description}</p>

            {title === 'Dados pessoais' && (
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
                {currentUser.name} - {currentUser.email}
              </p>
            )}

            {title === 'Enderecos' && (
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
                {addressFromProfile}
              </p>
            )}

            {title === 'Pagamentos' && (
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
                {lastOrder
                  ? `Ultimo metodo: ${lastOrder.paymentMethod.toUpperCase()}`
                  : 'Sem historico de pagamento'}
              </p>
            )}

            {title === 'Seguranca' && (
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
                Conta criada em {dateFormatter.format(new Date(currentUser.createdAt))}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Endereco principal
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Este endereco sera usado para preencher o checkout automaticamente.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            name="phone"
            value={profileForm.phone}
            onChange={handleProfileInputChange}
            placeholder="Telefone"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
          />
          <input
            name="cpf"
            value={profileForm.cpf}
            onChange={handleProfileInputChange}
            placeholder="CPF"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
          />
          <input
            name="address"
            value={profileForm.address}
            onChange={handleProfileInputChange}
            placeholder="Endereco completo"
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
          />
          <input
            name="city"
            value={profileForm.city}
            onChange={handleProfileInputChange}
            placeholder="Cidade"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
          />
          <input
            name="state"
            value={profileForm.state}
            onChange={handleProfileInputChange}
            placeholder="UF"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
          />
          <input
            name="zipCode"
            value={profileForm.zipCode}
            onChange={handleProfileInputChange}
            placeholder="CEP"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            {isSavingProfile ? 'Salvando...' : 'Salvar endereco principal'}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Atualize sempre que seu endereco de entrega mudar.
          </p>
        </div>

        {profileError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{profileError}</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Pedidos recentes</h2>

        {userOrders.length === 0 ? (
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Voce ainda nao possui pedidos. Finalize uma compra para iniciar seu historico.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {userOrders.slice(0, 4).map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Pedido #{order.id}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {currencyFormatter.format(order.total)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {orderStatusLabel[order.status]}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="favoritos"
        className="scroll-mt-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
              <Heart size={18} className="text-blue-600 dark:text-blue-400" />
              Meus favoritos
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Produtos que voce marcou com coracao no catalogo.
            </p>
          </div>
          <span className="rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-3 py-1 text-xs font-semibold">
            {favorites.length} item(ns)
          </span>
        </div>

        {favorites.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum favorito ainda. Clique no coracao dos produtos para salvar aqui.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 overflow-hidden"
              >
                <Link to={`/produto/${product.id}`} className="block">
                  <img
                    src={product.images?.[0] ?? product.image}
                    alt={product.name}
                    className="h-44 w-full object-cover"
                  />
                </Link>
                <div className="p-4">
                  <Link
                    to={`/produto/${product.id}`}
                    className="text-sm font-semibold text-slate-900 dark:text-white hover:underline line-clamp-1"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {currencyFormatter.format(product.price)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/produto/${product.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Ver produto
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void removeFavorite(product.id);
                      }}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-200 dark:border-red-900 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AccountPage;


