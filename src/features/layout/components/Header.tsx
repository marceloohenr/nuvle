import { LogOut, Menu, Moon, Search, ShieldCheck, ShoppingCart, Sun, UserCircle2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useCart } from '../../cart/context/CartContext';
import { useTheme } from '../../theme/context/ThemeContext';

interface HeaderProps {
  onCartToggle: () => void;
  onSearchToggle: () => void;
}

const Header = ({ onCartToggle, onSearchToggle }: HeaderProps) => {
  const { state } = useCart();
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const totalItems = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );
  const navItems = useMemo(() => {
    const baseItems = [
      { to: '/', label: 'Home' },
      { to: '/produtos', label: 'Produtos' },
      { to: '/carrinho', label: 'Carrinho' },
    ];

    if (isAuthenticated) {
      baseItems.push({ to: '/conta', label: 'Minha conta' });
      baseItems.push({ to: '/pedidos', label: 'Pedidos' });
    }

    if (isAdmin) {
      baseItems.push({ to: '/admin', label: 'Admin' });
    }

    return baseItems;
  }, [isAdmin, isAuthenticated]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/90 dark:bg-gray-950/80 border-b border-slate-200 dark:border-slate-800">
      <div className="bg-slate-900 text-slate-100 text-center text-xs py-2 px-4 tracking-wide">
        ENVIO RAPIDO | FRETE E SUPORTE VIA WHATSAPP
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://i.postimg.cc/zBtj4x02/fundo.png"
              alt="Nuvle"
              className="h-12 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onSearchToggle}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Pesquisar produtos"
            >
              <Search size={19} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              onClick={onCartToggle}
              className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={19} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {!isAuthenticated ? (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <UserCircle2 size={16} />
                Entrar
              </Link>
            ) : (
              <>
                <Link
                  to={isAdmin ? '/admin' : '/conta'}
                  className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {isAdmin ? <ShieldCheck size={16} /> : <UserCircle2 size={16} />}
                  {currentUser?.name?.split(' ')[0] ?? 'Conta'}
                </Link>
                <button
                  onClick={() => {
                    void logout();
                  }}
                  className="hidden sm:inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </>
            )}

            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="md:hidden p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Alternar menu"
            >
              {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {!isAuthenticated ? (
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white"
              >
                Entrar na conta
              </Link>
            ) : (
              <button
                onClick={() => {
                  void logout();
                  setIsMenuOpen(false);
                }}
                className="px-4 py-3 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 text-left"
              >
                Sair da conta
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
