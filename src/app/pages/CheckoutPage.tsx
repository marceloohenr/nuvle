import { CheckCircle2, ChevronLeft, CreditCard, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useCart } from '../../features/cart';
import type { CheckoutForm } from '../../features/cart';

type PaymentMethod = 'pix' | 'credit' | 'debit';
type CheckoutStep = 1 | 2 | 3;

const steps: Array<{ id: CheckoutStep; title: string }> = [
  { id: 1, title: 'Dados e entrega' },
  { id: 2, title: 'Pagamento' },
  { id: 3, title: 'Revisao final' },
];

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

const inputClass =
  'rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100';

const CheckoutPage = () => {
  const { state, dispatch } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [formData, setFormData] = useState<CheckoutForm>(initialForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showStepError, setShowStepError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );

  const progress = useMemo(() => ((currentStep - 1) / (steps.length - 1)) * 100, [currentStep]);

  const isCustomerStepValid = useMemo(() => {
    const requiredValues = [
      formData.name,
      formData.email,
      formData.phone,
      formData.cpf,
      formData.address,
      formData.city,
      formData.state,
      formData.zipCode,
    ];
    return requiredValues.every((value) => value.trim().length > 0);
  }, [formData]);

  const isPaymentStepValid = useMemo(() => {
    if (paymentMethod === 'pix') return true;
    return (
      cardData.number.trim().length >= 16 &&
      cardData.name.trim().length >= 3 &&
      cardData.expiry.trim().length >= 4 &&
      cardData.cvv.trim().length >= 3
    );
  }, [cardData, paymentMethod]);

  const canSubmit = isCustomerStepValid && isPaymentStepValid && acceptedTerms;

  if (state.items.length === 0 && !orderId) {
    return <Navigate to="/carrinho" replace />;
  }

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleCardInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const normalized = value.replace(/\s+/g, ' ').trimStart();
    setCardData((prev) => ({ ...prev, [name]: normalized }));
  };

  const goNext = () => {
    if (currentStep === 1 && !isCustomerStepValid) {
      setShowStepError(true);
      return;
    }
    if (currentStep === 2 && !isPaymentStepValid) {
      setShowStepError(true);
      return;
    }

    setShowStepError(false);
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as CheckoutStep) : prev));
  };

  const goBack = () => {
    setShowStepError(false);
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as CheckoutStep) : prev));
  };

  const handleSubmitOrder = () => {
    if (!canSubmit) {
      setShowStepError(true);
      return;
    }

    setShowStepError(false);
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
          Fluxo de checkout pronto para integrar pagamento real e backend.
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

        <div className="mt-6">
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : isDone
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.title}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-7">
          {currentStep === 1 && (
            <div className="space-y-6">
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
                    className={inputClass}
                  />
                  <input
                    required
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="E-mail"
                    className={inputClass}
                  />
                  <input
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Telefone"
                    className={inputClass}
                  />
                  <input
                    required
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="CPF"
                    className={inputClass}
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
                    className={`md:col-span-2 ${inputClass}`}
                  />
                  <input
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Cidade"
                    className={inputClass}
                  />
                  <select
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={inputClass}
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
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Forma de pagamento
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

              {paymentMethod === 'pix' ? (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Pagamento via PIX
                  </p>
                  <p className="text-sm text-emerald-700/90 dark:text-emerald-300/90 mt-1">
                    O codigo de pagamento sera exibido no passo final, apos a revisao.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    name="number"
                    value={cardData.number}
                    onChange={handleCardInputChange}
                    placeholder="Numero do cartao"
                    className={`md:col-span-2 ${inputClass}`}
                  />
                  <input
                    name="name"
                    value={cardData.name}
                    onChange={handleCardInputChange}
                    placeholder="Nome no cartao"
                    className={`md:col-span-2 ${inputClass}`}
                  />
                  <input
                    name="expiry"
                    value={cardData.expiry}
                    onChange={handleCardInputChange}
                    placeholder="MM/AA"
                    className={inputClass}
                  />
                  <input
                    name="cvv"
                    value={cardData.cvv}
                    onChange={handleCardInputChange}
                    placeholder="CVV"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">Resumo do cliente</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  {formData.name} - {formData.email}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {formData.address}, {formData.city} - {formData.state}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">Pagamento</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  Metodo selecionado:{' '}
                  <strong>
                    {paymentMethod === 'pix'
                      ? 'PIX'
                      : paymentMethod === 'credit'
                      ? 'Cartao de credito'
                      : 'Cartao de debito'}
                  </strong>
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Confirmo que revisei os dados do pedido e aceito os termos de compra.
                </span>
              </label>
            </div>
          )}

          {showStepError && (
            <p className="mt-5 text-sm text-red-600 dark:text-red-400">
              Revise os campos obrigatorios antes de continuar.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 px-5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-5 rounded-xl transition-colors"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 px-5 rounded-xl transition-colors"
              >
                {isSubmitting ? 'Processando pedido...' : 'Confirmar pedido'}
              </button>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 h-fit sticky top-28">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Seu resumo</h2>

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
