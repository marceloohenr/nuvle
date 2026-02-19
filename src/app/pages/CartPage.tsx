import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../features/cart';

const freeShippingTarget = 250;

const CartPage = () => {
  const { state, dispatch } = useCart();

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, freeShippingTarget - state.total);
  const shippingProgress = Math.min((state.total / freeShippingTarget) * 100, 100);

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  };

  if (state.items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-black p-10 text-center animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <ShoppingBag className="text-slate-600 dark:text-slate-400" size={30} />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
          Seu carrinho esta vazio
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Explore o catalogo e adicione seus produtos favoritos.
        </p>
        <Link
          to="/produtos"
          className="mt-6 inline-flex items-center gap-2 bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          <ArrowLeft size={16} />
          Ver produtos
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          Carrinho
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          Revise seu pedido antes de finalizar
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {itemCount} item(ns) selecionado(s).
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          {state.items.map((item) => {
            const itemKey = `${item.id}-${item.size}`;
            return (
              <article
                key={itemKey}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full sm:w-24 h-24 object-cover rounded-xl"
                  />

                  <div className="flex-1">
                    <h2 className="font-semibold text-slate-900 dark:text-white">{item.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Tamanho: {item.size || 'Unico'}
                    </p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">
                      R$ {item.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700">
                      <button
                        onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                        className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-xl"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-10 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                        className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-xl"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(itemKey)}
                      className="h-9 w-9 grid place-items-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Remover item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-5 h-fit sticky top-28">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Resumo do pedido
          </h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span>R$ {state.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Frete</span>
              <span>Calculado no checkout</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-lg font-bold text-slate-900 dark:text-white">
              <span>Total</span>
              <span>R$ {state.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-slate-600 transition-all duration-500"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {remainingForFreeShipping > 0
                ? `Faltam R$ ${remainingForFreeShipping.toFixed(2)} para frete prioritario.`
                : 'Parabens! Seu pedido entrou na faixa de frete prioritario.'}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <Link
              to="/checkout"
              className="w-full text-center bg-black hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 font-semibold py-3 rounded-xl transition-colors"
            >
              Ir para checkout
            </Link>
            <Link
              to="/produtos"
              className="w-full text-center border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Continuar comprando
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default CartPage;
