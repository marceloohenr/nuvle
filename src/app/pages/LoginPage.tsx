import { Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { isSupabaseConfigured } from '../../shared/lib/supabase';

type AuthMode = 'login' | 'register';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    currentUser,
    isAuthenticated,
    isAdmin,
    login,
    register,
    resendSignupConfirmation,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const isLogin = mode === 'login';
  const hasName = form.name.trim().length >= 3;
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const hasPassword = form.password.length >= 6;
  const isValid = isLogin ? hasEmail && hasPassword : hasName && hasEmail && hasPassword;

  const redirectParam = searchParams.get('redirect');
  const safeRedirect = redirectParam && redirectParam.startsWith('/') ? redirectParam : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;

    setErrorMessage('');
    setInfoMessage('');

    if (isLogin) {
      const result = await login({ email: form.email, password: form.password });

      if (!result.success) {
        if (result.needsEmailConfirmation) {
          setPendingConfirmationEmail(form.email.trim().toLowerCase());
          setInfoMessage(
            result.error ??
              'Seu e-mail ainda nao foi confirmado. Abra sua caixa de entrada e confirme para entrar.'
          );
          return;
        }

        setErrorMessage(result.error ?? 'Nao foi possivel entrar agora.');
        return;
      }

      if (safeRedirect) {
        navigate(safeRedirect, { replace: true });
        return;
      }

      navigate(result.role === 'admin' ? '/admin' : '/conta', { replace: true });
      return;
    }

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
    });

    if (!result.success) {
      setErrorMessage(result.error ?? 'Nao foi possivel criar sua conta agora.');
      return;
    }

    if (result.needsEmailConfirmation) {
      setPendingConfirmationEmail(form.email.trim().toLowerCase());
      setInfoMessage(
        result.message ??
          'Conta criada. Confirme seu e-mail no link enviado e depois faca login.'
      );
      setMode('login');
      setForm((prev) => ({ ...prev, password: '' }));
      return;
    }

    navigate('/conta', { replace: true });
  };

  if (isAuthenticated && currentUser) {
    return (
      <section className="max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400">
          Sessao ativa
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          Ola, {currentUser.name}
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Voce entrou como <strong>{isAdmin ? 'administrador' : 'cliente'}</strong>.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={isAdmin ? '/admin' : '/conta'}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            {isAdmin ? 'Ir para painel admin' : 'Ir para minha conta'}
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
            className="inline-flex items-center justify-center border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-5 py-3 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </section>
    );
  }

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
          {isSupabaseConfigured
            ? 'Autenticacao conectada ao Supabase.'
            : 'Login local ativo para clientes.'}
        </p>

        <div className="mt-6 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 inline-flex">
          <button
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setInfoMessage('');
              setPendingConfirmationEmail(null);
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
              setErrorMessage('');
              setInfoMessage('');
              setPendingConfirmationEmail(null);
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

          {infoMessage && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>{infoMessage}</p>
              {pendingConfirmationEmail && isSupabaseConfigured && (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={() => {
                    void (async () => {
                      setIsResending(true);
                      const resend = await resendSignupConfirmation(pendingConfirmationEmail);
                      setIsResending(false);

                      if (!resend.success) {
                        setErrorMessage(resend.error ?? 'Nao foi possivel reenviar o e-mail agora.');
                        return;
                      }

                      setErrorMessage('');
                      setInfoMessage(resend.message ?? 'E-mail de confirmacao reenviado.');
                    })();
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-300 dark:border-blue-800 px-4 py-2 text-sm font-semibold text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-60"
                >
                  {isResending ? 'Reenviando...' : 'Reenviar e-mail de confirmacao'}
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-8 md:p-10">
        <h2 className="text-2xl font-bold">Compre com tranquilidade</h2>
        <p className="mt-3 text-slate-300 text-sm">
          Acompanhe seus pedidos, gerencie seu historico e finalize suas compras com suporte da loja.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-800 p-4 border border-slate-700 space-y-2 text-sm text-slate-300">
          <p>Pedidos vinculados a sua conta para acompanhamento.</p>
          <p>Atualizacao de status em tempo real no painel de pedidos.</p>
          <p>Contato oficial disponivel no rodape da loja.</p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
