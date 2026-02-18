import { CheckCircle2, ChevronLeft, CreditCard, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useCart } from '../../features/cart';
import { useCatalog } from '../../features/catalog';
import { getCustomerProfile, upsertCustomerProfile } from '../../features/customerProfile';
import type { CheckoutForm } from '../../features/cart';
import { addLocalOrder } from '../../features/orders';
import type { OrderPaymentMethod, OrderStatus } from '../../features/orders';
import { validateCoupon, type ValidatedCoupon } from '../../features/coupons';
import { useStoreSettings } from '../../features/settings';
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

type PaymentMethod = OrderPaymentMethod;
type CheckoutStep = 1 | 2 | 3;
type CardData = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
};

type CompletedOrderSummary = {
  id: string;
  paymentMethod: PaymentMethod;
  total: number;
  customerName: string;
  itemCount: number;
  itemsPreview: string;
};

const CHECKOUT_DRAFT_KEY = 'nuvle-checkout-draft-v1';

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
  addressNumber: '',
  addressComplement: '',
  referencePoint: '',
  city: '',
  state: '',
  zipCode: '',
};

const initialCardData: CardData = {
  number: '',
  name: '',
  expiry: '',
  cvv: '',
};

const inputClass =
  'rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-slate-800 dark:text-slate-100';

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

const formatCardNumber = (value: string) => {
  const digits = digitsOnly(value).slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatCardExpiry = (value: string) => {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const formatCardCvv = (value: string) => digitsOnly(value).slice(0, 4);

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const CheckoutPage = () => {
  const { state, dispatch } = useCart();
  const { currentUser } = useAuth();
  const { consumeProductStock } = useCatalog();
  const { settings } = useStoreSettings();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [formData, setFormData] = useState<CheckoutForm>(initialForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardData, setCardData] = useState<CardData>(initialCardData);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showStepError, setShowStepError] = useState(false);
  const [stepErrorMessage, setStepErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderSummary | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [pixWhatsAppAttempted, setPixWhatsAppAttempted] = useState(false);
  const [pixWhatsAppBlocked, setPixWhatsAppBlocked] = useState(false);
  const [zipLookupMessage, setZipLookupMessage] = useState('');
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [isCityOptionsLoading, setIsCityOptionsLoading] = useState(false);
  const [cityOptionsMessage, setCityOptionsMessage] = useState('');
  const lastZipLookupRef = useRef('');

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );

  const progress = useMemo(() => ((currentStep - 1) / (steps.length - 1)) * 100, [currentStep]);

  const isCustomerStepValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      formData.name.trim().length >= 3 &&
      emailRegex.test(formData.email.trim()) &&
      digitsOnly(formData.phone).length >= 10 &&
      digitsOnly(formData.cpf).length === 11 &&
      formData.address.trim().length >= 6 &&
      formData.addressNumber.trim().length >= 1 &&
      formData.city.trim().length >= 2 &&
      formData.state.trim().length >= 2 &&
      digitsOnly(formData.zipCode).length === 8
    );
  }, [formData]);

  const isPaymentStepValid = useMemo(() => {
    if (paymentMethod === 'pix') return true;
    return (
      digitsOnly(cardData.number).length >= 16 &&
      cardData.name.trim().length >= 3 &&
      /^\d{2}\/\d{2}$/.test(cardData.expiry.trim()) &&
      digitsOnly(cardData.cvv).length >= 3
    );
  }, [cardData, paymentMethod]);

  const canSubmit = isCustomerStepValid && isPaymentStepValid && acceptedTerms;

  const couponDiscountPercentage = appliedCoupon?.discountPercentage ?? 0;
  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const raw = state.total * (couponDiscountPercentage / 100);
    return Math.round(raw * 100) / 100;
  }, [appliedCoupon, couponDiscountPercentage, state.total]);
  const finalTotal = useMemo(
    () => Math.max(0, Math.round((state.total - couponDiscountAmount) * 100) / 100),
    [couponDiscountAmount, state.total]
  );
  const whatsappBaseUrl = useMemo(() => {
    const raw = settings.contact.whatsappUrl.trim() || settings.socialLinks.whatsapp.trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }, [settings.contact.whatsappUrl, settings.socialLinks.whatsapp]);
  const pixWhatsAppMessage = useMemo(() => {
    if (!completedOrder || completedOrder.paymentMethod !== 'pix') return '';
    const lines = [
      'Novo pedido PIX - Nuvle',
      `Pedido: #${completedOrder.id}`,
      `Cliente: ${completedOrder.customerName}`,
      `Total: ${currencyFormatter.format(completedOrder.total)}`,
      `Itens (${completedOrder.itemCount}): ${completedOrder.itemsPreview}`,
      'Pagamento selecionado: PIX',
      'Pode me enviar a chave PIX para finalizar o pagamento?',
    ];
    return lines.join('\n');
  }, [completedOrder]);
  const pixWhatsAppHref = useMemo(() => {
    if (!whatsappBaseUrl || !pixWhatsAppMessage) return '';
    const separator = whatsappBaseUrl.includes('?') ? '&' : '?';
    return `${whatsappBaseUrl}${separator}text=${encodeURIComponent(pixWhatsAppMessage)}`;
  }, [pixWhatsAppMessage, whatsappBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<{
        formData: CheckoutForm;
        paymentMethod: PaymentMethod;
        currentStep: CheckoutStep;
        acceptedTerms: boolean;
      }>;

      if (parsed.formData) {
        setFormData({ ...initialForm, ...parsed.formData });
      }

      if (
        parsed.paymentMethod === 'pix' ||
        parsed.paymentMethod === 'credit' ||
        parsed.paymentMethod === 'debit'
      ) {
        setPaymentMethod(parsed.paymentMethod);
      }

      if (parsed.currentStep === 1 || parsed.currentStep === 2 || parsed.currentStep === 3) {
        setCurrentStep(parsed.currentStep);
      }

      if (typeof parsed.acceptedTerms === 'boolean') {
        setAcceptedTerms(parsed.acceptedTerms);
      }
    } catch {
      // Ignore broken draft payloads.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || orderId) return;

    try {
      localStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({
          formData,
          paymentMethod,
          currentStep,
          acceptedTerms,
        })
      );
    } catch {
      // Ignore storage quota or permission errors.
    }
  }, [acceptedTerms, currentStep, formData, orderId, paymentMethod]);

  useEffect(() => {
    const stateCode = normalizeBrazilStateCode(formData.state);
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
  }, [formData.state]);

  useEffect(() => {
    if (!currentUser) return;

    setFormData((prev) => ({
      ...prev,
      name: prev.name || currentUser.name,
      email: prev.email || currentUser.email,
    }));
  }, [currentUser]);

  useEffect(() => {
    if (!orderId || !completedOrder || completedOrder.paymentMethod !== 'pix') return;
    if (!pixWhatsAppHref || pixWhatsAppAttempted || typeof window === 'undefined') return;

    setPixWhatsAppAttempted(true);
    const timeoutId = window.setTimeout(() => {
      const popup = window.open(pixWhatsAppHref, '_blank', 'noopener,noreferrer');
      if (!popup) {
        setPixWhatsAppBlocked(true);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completedOrder, orderId, pixWhatsAppAttempted, pixWhatsAppHref]);

  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    void (async () => {
      try {
        const customerProfile = await getCustomerProfile(currentUser.id);
        if (!active) return;

        setFormData((prev) => ({
          ...prev,
          phone: prev.phone || customerProfile.phone,
          cpf: prev.cpf || customerProfile.cpf,
          address: prev.address || customerProfile.address,
          addressNumber: prev.addressNumber || customerProfile.addressNumber,
          addressComplement: prev.addressComplement || customerProfile.addressComplement,
          referencePoint: prev.referencePoint || customerProfile.referencePoint,
          city: prev.city || customerProfile.city,
          state: prev.state || customerProfile.state,
          zipCode: prev.zipCode || customerProfile.zipCode,
        }));
      } catch {
        // Ignore profile prefill failures and keep checkout working.
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser]);

  if (state.items.length === 0 && !orderId) {
    return <Navigate to="/carrinho" replace />;
  }

  if (isSupabaseConfigured && !currentUser) {
    return <Navigate to="/login?redirect=/checkout" replace />;
  }

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'cpf') nextValue = formatCpf(value);
    if (name === 'phone') nextValue = formatPhone(value);
    if (name === 'zipCode') nextValue = formatZipCode(value);
    if (name === 'state') {
      nextValue = normalizeBrazilStateCode(value);
      setFormData((prev) => ({
        ...prev,
        state: nextValue,
        city: prev.state === nextValue ? prev.city : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: nextValue }));
    }

    if (name === 'zipCode') {
      const normalizedZip = normalizeZipCodeDigits(nextValue);
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
          setFormData((prev) => ({
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
    }
  };

  const handleCardInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'number') nextValue = formatCardNumber(value);
    if (name === 'expiry') nextValue = formatCardExpiry(value);
    if (name === 'cvv') nextValue = formatCardCvv(value);

    setCardData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleApplyCoupon = () => {
    setCouponMessage('');

    if (!isSupabaseConfigured) {
      setCouponMessage('Cupons indisponiveis neste ambiente.');
      return;
    }

    if (!couponCode.trim()) {
      setCouponMessage('Digite um codigo de cupom.');
      return;
    }

    setIsApplyingCoupon(true);
    void (async () => {
      const result = await validateCoupon(couponCode);
      setIsApplyingCoupon(false);

      if (!result.success || !result.coupon) {
        setAppliedCoupon(null);
        setCouponMessage(result.error ?? 'Cupom invalido.');
        return;
      }

      setAppliedCoupon(result.coupon);
      setCouponCode(result.coupon.code);
      setCouponMessage(
        `Cupom aplicado: ${result.coupon.code} (-${result.coupon.discountPercentage}%).`
      );
    })();
  };

  const goNext = () => {
    if (currentStep === 1 && !isCustomerStepValid) {
      setStepErrorMessage('Revise os dados de entrega antes de continuar.');
      setShowStepError(true);
      return;
    }
    if (currentStep === 2 && !isPaymentStepValid) {
      setStepErrorMessage('Revise os dados de pagamento antes de continuar.');
      setShowStepError(true);
      return;
    }

    setStepErrorMessage('');
    setShowStepError(false);
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as CheckoutStep) : prev));
  };

  const goBack = () => {
    setStepErrorMessage('');
    setShowStepError(false);
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as CheckoutStep) : prev));
  };

  const handleSubmitOrder = () => {
    if (!canSubmit) {
      setStepErrorMessage('Confirme os termos e revise os dados para concluir o pedido.');
      setShowStepError(true);
      return;
    }

    setShowStepError(false);
    setStepErrorMessage('');
    setIsSubmitting(true);
    const orderItemsSnapshot = state.items.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
    }));
    const customerSnapshot = { ...formData };
    const orderTotal = finalTotal;
    if (!isSupabaseConfigured) {
      const stockResult = consumeProductStock(
        orderItemsSnapshot.map((item) => ({
          id: item.id,
          size: item.size,
          quantity: item.quantity,
        }))
      );

      if (!stockResult.success) {
        const firstIssue = stockResult.issues?.[0];
        setStepErrorMessage(
          firstIssue
            ? `Estoque insuficiente para ${firstIssue.productName}${
                firstIssue.size ? ` (tam. ${firstIssue.size})` : ''
              }. Solicitado: ${firstIssue.requested}, disponivel: ${firstIssue.available}.`
            : 'Nao foi possivel reservar estoque para este pedido.'
        );
        setShowStepError(true);
        setIsSubmitting(false);
        return;
      }
    }

    setTimeout(() => {
      void (async () => {
        try {
          const generatedOrder = `NV${Date.now().toString().slice(-8)}`;
          const orderStatus: OrderStatus =
            paymentMethod === 'pix' ? 'pending_payment' : 'paid';

          await addLocalOrder({
            id: generatedOrder,
            userId: currentUser?.id,
            createdAt: new Date().toISOString(),
            paymentMethod,
            status: orderStatus,
            total: orderTotal,
            items: orderItemsSnapshot,
            customer: customerSnapshot,
          });

          if (currentUser) {
            try {
              await upsertCustomerProfile(currentUser.id, {
                phone: customerSnapshot.phone,
                cpf: customerSnapshot.cpf,
                address: customerSnapshot.address,
                addressNumber: customerSnapshot.addressNumber,
                addressComplement: customerSnapshot.addressComplement,
                referencePoint: customerSnapshot.referencePoint,
                city: customerSnapshot.city,
                state: customerSnapshot.state,
                zipCode: customerSnapshot.zipCode,
              });
            } catch {
              // Profile save failure must not block successful order placement.
            }
          }

          const itemsPreview = orderItemsSnapshot
            .slice(0, 3)
            .map((item) => `${item.name} x${item.quantity}${item.size ? ` (${item.size})` : ''}`)
            .join(', ');

          setCompletedOrder({
            id: generatedOrder,
            paymentMethod,
            total: orderTotal,
            customerName: customerSnapshot.name,
            itemCount: orderItemsSnapshot.reduce((sum, item) => sum + item.quantity, 0),
            itemsPreview: itemsPreview || 'Sem itens',
          });
          setPixWhatsAppAttempted(false);
          setPixWhatsAppBlocked(false);
          setOrderId(generatedOrder);
          dispatch({ type: 'CLEAR_CART' });
          if (typeof window !== 'undefined') {
            localStorage.removeItem(CHECKOUT_DRAFT_KEY);
          }
          setIsSubmitting(false);
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : 'Nao foi possivel registrar o pedido no banco.';
          setStepErrorMessage(message);
          setShowStepError(true);
          setIsSubmitting(false);
        }
      })();
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
          {currentUser
            ? 'Pedido vinculado a sua conta para acompanhamento.'
            : 'Fluxo de checkout pronto para integrar pagamento real e backend.'}
        </p>
        {completedOrder?.paymentMethod === 'pix' && (
          <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-left max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Pedido PIX: envio no WhatsApp
            </p>
            <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-300/90">
              Tentamos abrir o WhatsApp automaticamente com a mensagem do pedido para o contato
              PIX cadastrado.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={pixWhatsAppHref || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Enviar mensagem no WhatsApp
              </a>
              {pixWhatsAppBlocked && (
                <p className="text-xs text-amber-700 dark:text-amber-300 self-center">
                  O navegador bloqueou a abertura automatica. Toque no botao para enviar.
                </p>
              )}
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/pedidos/${orderId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Ver pedido
          </Link>
          <Link
            to="/pedidos"
            className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Ver historico
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
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="CEP"
                    className={inputClass}
                  />
                  <select
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={inputClass}
                  >
                    <option value="">Estado (UF)</option>
                    {BRAZIL_STATE_OPTIONS.map((stateOption) => (
                      <option key={stateOption.code} value={stateOption.code}>
                        {stateOption.code} - {stateOption.name}
                      </option>
                    ))}
                  </select>
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
                    name="addressNumber"
                    value={formData.addressNumber}
                    onChange={handleInputChange}
                    placeholder="Numero"
                    className={inputClass}
                  />
                  <input
                    name="addressComplement"
                    value={formData.addressComplement}
                    onChange={handleInputChange}
                    placeholder="Complemento"
                    className={inputClass}
                  />
                  <input
                    name="referencePoint"
                    value={formData.referencePoint}
                    onChange={handleInputChange}
                    placeholder="Ponto de referencia"
                    className={inputClass}
                  />
                  <input
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    list="checkout-city-options"
                    placeholder={
                      formData.state ? 'Cidade' : 'Selecione o estado para listar cidades'
                    }
                    className={inputClass}
                  />
                  <datalist id="checkout-city-options">
                    {cityOptions.map((cityOption) => (
                      <option key={cityOption} value={cityOption} />
                    ))}
                  </datalist>
                </div>
                {(zipLookupMessage || isZipLookupLoading) && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {isZipLookupLoading ? 'Consultando CEP...' : zipLookupMessage}
                  </p>
                )}
                {(isCityOptionsLoading || cityOptionsMessage) && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {isCityOptionsLoading ? 'Carregando cidades...' : cityOptionsMessage}
                  </p>
                )}
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
                  {formData.address}, {formData.addressNumber || 's/n'} - {formData.city} -{' '}
                  {formData.state}
                </p>
                {(formData.addressComplement || formData.referencePoint) && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {formData.addressComplement
                      ? `Complemento: ${formData.addressComplement}`
                      : ''}
                    {formData.addressComplement && formData.referencePoint ? ' | ' : ''}
                    {formData.referencePoint
                      ? `Referencia: ${formData.referencePoint}`
                      : ''}
                  </p>
                )}
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
              {stepErrorMessage || 'Revise os campos obrigatorios antes de continuar.'}
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

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Cupom de desconto
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Digite o codigo do cupom"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  onClick={handleApplyCoupon}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {isApplyingCoupon ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
              {appliedCoupon && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                      {appliedCoupon.code} (-{appliedCoupon.discountPercentage}%)
                    </p>
                    {appliedCoupon.description && (
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 line-clamp-1">
                        {appliedCoupon.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponMessage('Cupom removido.');
                    }}
                    className="rounded-lg border border-emerald-200 dark:border-emerald-900 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              )}
              {couponMessage && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{couponMessage}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span>R$ {state.total.toFixed(2)}</span>
              </div>
              {couponDiscountAmount > 0 && appliedCoupon && (
                <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-300">
                  <span>
                    Cupom {appliedCoupon.code} (-{appliedCoupon.discountPercentage}%)
                  </span>
                  <span>- R$ {couponDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2">
                <span>Total</span>
                <span>R$ {finalTotal.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Frete negociado no atendimento via WhatsApp.
              </p>
            </div>
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
