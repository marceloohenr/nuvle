import { Eye, EyeOff, Lock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../../shared/lib/supabase';

const ResetPasswordPage = () => {
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsReady(true);
      return;
    }

    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSessionEmail(data.session?.user.email ?? null);
      setIsReady(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setSessionEmail(session?.user.email ?? null);
      setIsReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isValidPassword = form.password.length >= 6;
  const passwordsMatch =
    form.password.length > 0 &&
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const canSubmit = useMemo(() => {
    if (!isSupabaseConfigured || !supabase) return false;
    if (!sessionEmail) return false;
    return isValidPassword && passwordsMatch && !isSaving;
  }, [isSaving, isValidPassword, passwordsMatch, sessionEmail]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setInfoMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Supabase nao configurado.');
      return;
    }

    if (!sessionEmail) {
      setErrorMessage(
        'Sessao de redefinicao nao encontrada. Abra o link do e-mail de redefinicao de senha para continuar.'
      );
      return;
    }

    if (!isValidPassword) {
      setErrorMessage('Senha precisa ter ao menos 6 caracteres.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('As senhas nao conferem.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInfoMessage('Senha atualizada com sucesso. Voce ja pode entrar normalmente.');
    setForm({ password: '', confirmPassword: '' });
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10 text-center">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          Redefinir senha
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Esta pagina funciona apenas quando o Supabase esta configurado.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center justify-center bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Voltar para o login
          </Link>
        </div>
      </section>
    );
  }

  if (!isReady) {
    return (
      <section className="max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">Carregando sessao...</p>
      </section>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-2 lg:items-stretch">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-600 dark:text-slate-400">
          Seguranca da conta
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          Redefinir senha
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Abra o link enviado por e-mail para chegar aqui. Depois defina sua nova senha.
        </p>

        {!sessionEmail && (
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/30 p-3 text-sm text-slate-800 dark:text-slate-200 space-y-2">
            <p>
              Nenhuma sessao de recuperacao foi detectada.
            </p>
            <p>
              Volte ao login e clique em <strong>Esqueci minha senha</strong> para receber o link.
              Se nao encontrar, verifique a caixa de spam.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-950/40 transition-colors"
            >
              Ir para o login
            </Link>
          </div>
        )}

        {sessionEmail && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
            Sessao detectada para <strong>{sessionEmail}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nova senha
            </span>
            <div className="mt-1 relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-12 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Minimo de 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirmar senha
            </span>
            <div className="mt-1 relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={isConfirmVisible ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-12 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Digite novamente"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setIsConfirmVisible((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                aria-label={isConfirmVisible ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {isConfirmVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {infoMessage && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/30 p-3 text-sm text-slate-800 dark:text-slate-200 space-y-2">
              <p>{infoMessage}</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-950/40 transition-colors"
              >
                Voltar para o login
              </Link>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3 text-sm text-slate-700 dark:text-slate-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 dark:disabled:bg-slate-600 dark:disabled:text-slate-300 font-semibold py-3 rounded-xl transition-colors"
          >
            {isSaving ? 'Salvando...' : 'Atualizar senha'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-8 md:p-10">
        <h2 className="text-2xl font-bold">Dicas rapidas</h2>
        <p className="mt-3 text-slate-300 text-sm">
          Se voce nao estiver recebendo o e-mail, confira se o endereco esta correto e verifique a
          caixa de spam.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-800 p-4 border border-slate-700 space-y-2 text-sm text-slate-300">
          <p>Use uma senha com pelo menos 6 caracteres.</p>
          <p>Evite reutilizar senhas de outros sites.</p>
          <p>Depois de atualizar, voce pode voltar ao login e entrar normalmente.</p>
        </div>
      </section>
    </div>
  );
};

export default ResetPasswordPage;

