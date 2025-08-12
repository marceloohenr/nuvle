import React, { useState } from 'react';
import { X, ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPixCode, setShowPixCode] = useState(false);

  const shippingCost = state.total > 100 ? 0 : 15.90;
  const finalTotal = state.total + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setShowPixCode(true);
      setIsProcessing(false);
    }, 2000);
  };

  const generatePixCode = () => {
    return `nuvleoficial@gmail.com`;
  };

  if (!isOpen) return null;

  if (showPixCode) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
          
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Smartphone className="text-green-600 dark:text-green-400" size={32} />
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                Pague com PIX
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Use o código abaixo para fazer o pagamento via PIX
              </p>

              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  R$ {finalTotal.toFixed(2)}
                </p>
                <div className="text-xs bg-white dark:bg-gray-700 p-2 rounded border break-all">
                  {generatePixCode()}
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                <p>1. Copie o código PIX acima</p>
                <p>2. Abra o app do seu banco</p>
                <p>3. Escolha PIX Copia e Cola</p>
                <p>4. Cole o código e confirme</p>
              </div>

              <button
                onClick={() => {
                  dispatch({ type: 'CLEAR_CART' });
                  onClose();
                  alert('Aguardando confirmação do pagamento PIX!');
                }}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                Já Fiz o Pagamento
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <Smartphone size={20} />
                    <span className="font-medium">Pagamento via PIX</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Você receberá o código PIX após confirmar o pedido
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal:</span>
                    <span>R$ {state.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Frete:</span>
                    <span>{shippingCost === 0 ? 'Grátis' : `R$ ${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gray-800 dark:text-white border-t pt-2">
                    <span>Total:</span>
                    <span>R$ {finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <Smartphone size={20} />
                    <span>Pagar via PIX - R$ {finalTotal.toFixed(2)}</span>
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