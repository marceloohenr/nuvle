import { PackageSearch, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const orderSteps = [
  { label: 'Aguardando pagamento', icon: ShieldCheck },
  { label: 'Pago e aprovado', icon: ShoppingBag },
  { label: 'Em separacao', icon: PackageSearch },
  { label: 'Enviado', icon: Truck },
];

const OrdersPage = () => {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Meus pedidos
        </p>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
          Acompanhamento pronto para receber pedidos reais
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-3">
          O fluxo visual de historico e status ja esta preparado. Falta apenas a
          conexao com autenticacao e banco de dados.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <PackageSearch className="text-blue-600 dark:text-blue-400" size={30} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">
          Nenhum pedido encontrado
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Assim que um pedido for finalizado com conta logada, ele aparecera aqui
          com numero, data, valor e status.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/produtos"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Ver produtos
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Entrar na conta
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Etapas de rastreio que serao usadas
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {orderSteps.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <Icon size={18} className="text-blue-600 dark:text-blue-400" />
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
