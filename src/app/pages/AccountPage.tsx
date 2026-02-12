import { CreditCard, MapPin, ShieldCheck, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const accountBlocks = [
  {
    title: 'Dados pessoais',
    description: 'Nome, e-mail e telefone para contato.',
    icon: UserCircle2,
  },
  {
    title: 'Enderecos',
    description: 'Cadastrar enderecos de entrega para acelerar o checkout.',
    icon: MapPin,
  },
  {
    title: 'Pagamentos',
    description: 'Gestao de metodos preferidos com seguranca.',
    icon: CreditCard,
  },
  {
    title: 'Seguranca',
    description: 'Troca de senha e configuracoes de acesso.',
    icon: ShieldCheck,
  },
];

const AccountPage = () => {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Minha conta
        </p>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
          Painel da conta pronto para autenticacao
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-3 max-w-3xl">
          Esta pagina ja esta estruturada para receber os dados reais do usuario
          quando conectarmos o backend de login e pedidos.
        </p>
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
            <button
              disabled
              className="mt-5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-4 py-2 text-sm font-medium cursor-not-allowed"
            >
              Disponivel apos login real
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Ainda sem sessao autenticada
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mt-2">
          Quando o login estiver integrado, os dados desta area serao carregados
          automaticamente.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Ir para Login
          </Link>
          <Link
            to="/pedidos"
            className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Ver area de pedidos
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
