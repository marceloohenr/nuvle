import React, { useState } from 'react';
import { X, ArrowLeft, CreditCard, Smartphone, DollarSign, CheckCircle, Copy } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { CheckoutForm } from '../types/product';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ isOpen, onClose, onBack }) => {
  const { state, dispatch } = useCart();
  const [formData, setFormData] = useState<CheckoutForm>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'success'>('form');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [pixCode, setPixCode] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const finalTotal = state.total;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Format card number
    if (e.target.name === 'number') {
      value = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (value.length > 19) value = value.substring(0, 19);
    }
    
    // Format expiry date
    if (e.target.name === 'expiry') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
      if (value.length > 5) value = value.substring(0, 5);
    }
    
    // Format CVV
    if (e.target.name === 'cvv') {
      value = value.replace(/\D/g, '');
      if (value.length > 4) value = value.substring(0, 4);
    }
    
    setCardData({ ...cardData, [e.target.name]: value });
  };

  const generateOrderNumber = () => {
    return 'NV' + Date.now().toString().slice(-8);
  };

  const generatePixCode = () => {
    // Simulated PIX code - in real implementation, this would come from payment provider
    const timestamp = Date.now();
    return `00020126580014br.gov.bcb.pix0136nuvleoficial@gmail.com0208NUVLE${timestamp}5204000053039865802BR5905NUVLE6009SAO_PAULO62070503***6304`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate form validation and processing
    setTimeout(() => {
      const newOrderNumber = generateOrderNumber();
      setOrderNumber(newOrderNumber);
      
      if (paymentMethod === 'pix') {
        setPixCode(generatePixCode());
      }
      
      setPaymentStep('payment');
      setIsProcessing(false);
    }, 2000);
  };

  const handlePaymentConfirmation = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Send WhatsApp message
      const whatsappMessage = generateWhatsAppMessage();
      const whatsappUrl = `https://wa.me/5581988966556?text=${whatsappMessage}`;
      window.open(whatsappUrl, '_blank');
      
      // Clear cart and show success
      dispatch({ type: 'CLEAR_CART' });
      setPaymentStep('success');
      setIsProcessing(false);
    }, 3000);
  };

  const generateWhatsAppMessage = () => {
    const itemsList = state.items.map(item => 
      `• ${item.name} (Tamanho: ${item.size || 'N/A'}) - Qtd: ${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const paymentMethodText = {
      pix: 'PIX',
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito'
    };

    const message = `🛍️ *NOVO PEDIDO - NUVLE*
📋 *Pedido:* ${orderNumber}

👤 *Dados do Cliente:*
Nome: ${formData.name}
Email: ${formData.email}
Telefone: ${formData.phone}
CPF: ${formData.cpf}

📍 *Endereço de Entrega:*
${formData.address}
${formData.city} - ${formData.state}
CEP: ${formData.zipCode}

🛒 *Itens do Pedido:*
${itemsList}

💰 *Total: R$ ${finalTotal.toFixed(2)}*

💳 *Forma de Pagamento: ${paymentMethodText[paymentMethod]}*
${paymentMethod === 'pix' ? '✅ Pagamento PIX confirmado' : '✅ Pagamento com cartão processado'}

#USENUVLE ⚡`;

    return encodeURIComponent(message);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    alert('Código PIX copiado!');
  };

  if (!isOpen) return null;

  // Success Screen
  if (paymentStep === 'success') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Pedido Confirmado!
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Seu pedido <strong>#{orderNumber}</strong> foi processado com sucesso!
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total pago:
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  R$ {finalTotal.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <p>✅ Pagamento confirmado</p>
                <p>📱 Detalhes enviados para WhatsApp</p>
                <p>📦 Pedido será processado em breve</p>
                <p>🚚 Frete negociável via WhatsApp</p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment Processing Screen
  if (paymentStep === 'payment') {
    if (paymentMethod === 'pix') {
      return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="absolute inset-0 bg-black bg-opacity-50" />
            
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Smartphone className="text-green-600 dark:text-green-400" size={32} />
                </div>
                
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Pagamento PIX
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Pedido: <strong>#{orderNumber}</strong>
                </p>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                    R$ {finalTotal.toFixed(2)}
                  </p>
                  
                  <div className="bg-white dark:bg-gray-700 p-3 rounded border text-xs break-all mb-3">
                    {pixCode}
                  </div>
                  
                  <button
                    onClick={copyPixCode}
                    className="flex items-center justify-center space-x-2 w-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    <Copy size={16} />
                    <span>Copiar Código PIX</span>
                  </button>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 mb-6">
                  <p>1. Copie o código PIX acima</p>
                  <p>2. Abra o app do seu banco</p>
                  <p>3. Escolha PIX Copia e Cola</p>
                  <p>4. Cole o código e confirme</p>
                </div>

                <button
                  onClick={handlePaymentConfirmation}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
                >
                  {isProcessing ? 'Confirmando Pagamento...' : 'Confirmar Pagamento PIX'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Card Payment Screen
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito'}
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Pedido: <strong>#{orderNumber}</strong>
              </p>

              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  name="number"
                  placeholder="Número do cartão"
                  value={cardData.number}
                  onChange={handleCardInputChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Nome no cartão"
                  value={cardData.name}
                  onChange={handleCardInputChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="expiry"
                    placeholder="MM/AA"
                    value={cardData.expiry}
                    onChange={handleCardInputChange}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  />
                  <input
                    type="text"
                    name="cvv"
                    placeholder="CVV"
                    value={cardData.cvv}
                    onChange={handleCardInputChange}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  />
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  R$ {finalTotal.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                </p>
              </div>

              <button
                onClick={handlePaymentConfirmation}
                disabled={isProcessing || !cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isProcessing ? 'Processando Pagamento...' : `Pagar R$ ${finalTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Form
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-8">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Finalizar Compra
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Nome completo *"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="E-mail *"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Telefone *"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  />
                  <input
                    type="text"
                    name="cpf"
                    placeholder="CPF *"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Endereço de Entrega
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="address"
                      placeholder="Endereço completo *"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    />
                    <input
                      type="text"
                      name="zipCode"
                      placeholder="CEP *"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="city"
                      placeholder="Cidade *"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    />
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    >
                      <option value="">Selecione o estado *</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                  Resumo do Pedido
                </h3>
                
                {/* Payment Method Selection */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Forma de Pagamento:
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="payment"
                        value="pix"
                        checked={paymentMethod === 'pix'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'pix')}
                        className="text-blue-600"
                      />
                      <Smartphone className="text-green-600" size={20} />
                      <div>
                        <span className="font-medium text-gray-800 dark:text-white">PIX</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pagamento instantâneo</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="payment"
                        value="credit"
                        checked={paymentMethod === 'credit'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'credit')}
                        className="text-blue-600"
                      />
                      <CreditCard className="text-blue-600" size={20} />
                      <div>
                        <span className="font-medium text-gray-800 dark:text-white">Cartão de Crédito</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Parcelamento disponível</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="payment"
                        value="debit"
                        checked={paymentMethod === 'debit'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'debit')}
                        className="text-blue-600"
                      />
                      <DollarSign className="text-purple-600" size={20} />
                      <div>
                        <span className="font-medium text-gray-800 dark:text-white">Cartão de Débito</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Débito à vista</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-lg text-gray-800 dark:text-white border-t pt-2">
                    <span>Total:</span>
                    <span>R$ {finalTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Frete negociável no WhatsApp
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 ${
                  paymentMethod === 'pix' 
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400' 
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
                } text-white`}
              >
                {isProcessing ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    {paymentMethod === 'pix' ? <Smartphone size={20} /> : <CreditCard size={20} />}
                    <span>
                      Continuar para Pagamento - R$ {finalTotal.toFixed(2)}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;