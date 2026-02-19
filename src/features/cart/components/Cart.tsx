import React from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useCart();

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-black shadow-xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Carrinho ({state.items.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Fechar carrinho"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                Atencao: verifique estoque antes de comprar
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Frete negociavel no WhatsApp
              </p>
            </div>

            {state.items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Seu carrinho esta vazio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.items.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />

                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-800 dark:text-white">
                        {item.name}
                      </h3>
                      {item.size && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Tamanho: {item.size}
                        </p>
                      )}
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(`${item.id}-${item.size}`, item.quantity - 1)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="text-sm font-medium text-gray-800 dark:text-white px-2">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(`${item.id}-${item.size}`, item.quantity + 1)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>

                      <button
                        onClick={() => removeItem(`${item.id}-${item.size}`)}
                        className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 ml-2"
                        aria-label="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.items.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between font-bold text-lg text-gray-800 dark:text-white border-t pt-2">
                  <span>Total:</span>
                  <span>R$ {state.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Frete sera negociado via WhatsApp
                </p>
              </div>

              <Link
                to="/checkout"
                onClick={onClose}
                className="block w-full text-center bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 font-medium py-3 px-4 rounded-md transition-colors"
              >
                Finalizar compra
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
