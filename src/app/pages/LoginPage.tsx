import { useState } from 'react';
import { Lock, Mail, User } from 'lucide-react';

type AuthMode = 'login' | 'register';

const LoginPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showNotice, setShowNotice] = useState(false);

  const isLogin = mode === 'login';
  const hasName = form.name.trim().length >= 3;
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const hasPassword = form.password.length >= 6;
  const isValid = isLogin ? hasEmail && hasPassword : hasName && hasEmail && hasPassword;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    setShowNotice(true);
  };

  return (
    <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-2 lg:items-stretch">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400">
          Area do cliente
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          {isLogin ? 'Entrar na sua conta' : 'Criar conta'}
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Layout pronto para integrar autenticacao real na proxima etapa.
        </p>

        <div className="mt-6 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 inline-flex">
          <button
            onClick={() => {
              setMode('login');
              setShowNotice(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isLogin
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setMode('register');
              setShowNotice(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              !isLogin
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nome completo
              </span>
              <div className="mt-1 relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu nome"
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</span>
            <div className="mt-1 relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="voce@email.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</span>
            <div className="mt-1 relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimo de 6 caracteres"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {showNotice && (
          <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 text-sm text-blue-700 dark:text-blue-300">
            Fluxo visual pronto. Na etapa de banco vamos conectar esse formulario ao
            sistema de autenticacao.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-8 md:p-10">
        <h2 className="text-2xl font-bold">O que voce vai ter com login ativo</h2>
        <ul className="mt-5 space-y-3 text-slate-300">
          <li className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
            Historico completo dos pedidos por conta.
          </li>
          <li className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
            Acompanhamento de status e rastreio em tempo real.
          </li>
          <li className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
            Dados de entrega salvos para checkout mais rapido.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-slate-800 p-5 border border-slate-700">
          <p className="text-sm text-slate-300">
            Status atual:
            <strong className="text-white"> interface pronta para integrar backend.</strong>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
