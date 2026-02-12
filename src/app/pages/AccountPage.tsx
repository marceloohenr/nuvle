import { CreditCard, LogOut, MapPin, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { getLocalOrders, orderStatusLabel } from '../../features/orders';
import type { LocalOrder } from '../../features/orders';

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
    description: 'Endereco principal recuperado dos pedidos realizados.',
    icon: MapPin,
  },
  {
    title: 'Pagamentos',
    description: 'Historico de metodos usados no checkout.',
    icon: CreditCard,
  },
  {
    title: 'Seguranca',
    description: 'Sessao local ativa neste dispositivo.',
    icon: ShieldCheck,
  },
];

const canAccessOrder = (order: LocalOrder, userId: string, email: string) => {
  if (order.userId && order.userId === userId) return true;
  return order.customer.email.toLowerCase() === email.toLowerCase();
};

const AccountPage = () => {
  const { currentUser, isAdmin, isAuthenticated, logout } = useAuth();
  const userOrders = useMemo(() => {
    if (!currentUser || isAdmin) return [];

    return getLocalOrders().filter((order) =>
      canAccessOrder(order, currentUser.id, currentUser.email)
    );
  }, [currentUser, isAdmin]);

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
            onClick={logout}
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
  const addressFromOrder = lastOrder?.customer.address
    ? `${lastOrder.customer.address}, ${lastOrder.customer.city} - ${lastOrder.customer.state}`
    : 'Nenhum endereco registrado ainda';

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
            onClick={logout}
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
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{addressFromOrder}</p>
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
    </div>
  );
};

export default AccountPage;

