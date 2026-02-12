import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Smartphone } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useCart } from '../../features/cart';
import type { CheckoutForm } from '../../features/cart';

type PaymentMethod = 'pix' | 'credit' | 'debit';

const initialForm: CheckoutForm = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
};

const CheckoutPage = () => {
  const { state, dispatch } = useCart();
  const [formData, setFormData] = useState<CheckoutForm>(initialForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );

  if (state.items.length === 0 && !orderId) {
    return <Navigate to="/carrinho" replace />;
  }

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const generatedOrder = `NV${Date.now().toString().slice(-8)}`;
      setOrderId(generatedOrder);
      dispatch({ type: 'CLEAR_CART' });
      setIsSubmitting(false);
    }, 1200);
  };

  if (orderId) {
    return (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={34} />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
          Pedido criado com sucesso
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Numero do pedido: <strong>#{orderId}</strong>
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Visual pronto para integrar pagamento e persistencia no backend.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/pedidos"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Ir para meus pedidos
          </Link>
          <Link
            to="/produtos"
            className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar ao catalogo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Checkout
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          Finalize sua compra
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {itemCount} item(ns) no pedido.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-7 space-y-6"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Dados pessoais
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nome completo"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
              <input
                required
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="E-mail"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
              <input
                required
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Telefone"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
              <input
                required
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                placeholder="CPF"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Endereco de entrega
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <input
                required
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Endereco completo"
                className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
              <input
                required
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Cidade"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
              <select
                required
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              >
                <option value="">Estado</option>
                <option value="PE">Pernambuco</option>
                <option value="SP">Sao Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="BA">Bahia</option>
              </select>
              <input
                required
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                placeholder="CEP"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pagamento
            </h2>
            <div className="mt-3 grid gap-2">
              <label className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="pix"
                  checked={paymentMethod === 'pix'}
                  onChange={() => setPaymentMethod('pix')}
                />
                <Smartphone className="text-green-600" size={18} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  PIX
                </span>
              </label>
              <label className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="credit"
                  checked={paymentMethod === 'credit'}
                  onChange={() => setPaymentMethod('credit')}
                />
                <CreditCard className="text-blue-600" size={18} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Cartao de credito
                </span>
              </label>
              <label className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="debit"
                  checked={paymentMethod === 'debit'}
                  onChange={() => setPaymentMethod('debit')}
                />
                <CreditCard className="text-purple-600" size={18} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Cartao de debito
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? 'Processando pedido...' : 'Confirmar pedido'}
          </button>
        </form>

        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 h-fit sticky top-28">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Seu resumo
          </h2>

          <div className="mt-4 space-y-3">
            {state.items.map((item) => (
              <div
                key={`${item.id}-${item.size}`}
                className="flex justify-between text-sm text-slate-600 dark:text-slate-300"
              >
                <span className="line-clamp-1 max-w-[70%]">
                  {item.name} x{item.quantity}
                </span>
                <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white">
              <span>Total</span>
              <span>R$ {state.total.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Frete negociado no atendimento via WhatsApp.
            </p>
          </div>

          <Link
            to="/carrinho"
            className="mt-5 w-full text-center inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar ao carrinho
          </Link>
        </aside>
      </section>
    </div>
  );
};

export default CheckoutPage;
