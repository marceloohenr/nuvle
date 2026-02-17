import { LogOut, Menu, Moon, Search, ShieldCheck, ShoppingCart, Sun, UserCircle2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useCart } from '../../cart/context/CartContext';
import { useTheme } from '../../theme/context/ThemeContext';
import nuvleLogo from '../../../shared/assets/nuvle-logo-neon.svg';

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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 text-white text-center text-[11px] py-2 px-4 tracking-[0.24em] font-semibold uppercase">
        Frete rapido | suporte no WhatsApp | trocas facilitadas
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="h-[88px] flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-[130px]">
            <img
              src={nuvleLogo}
              alt="Nuvle"
              className="h-10 sm:h-11 md:h-12 w-auto drop-shadow-[0_0_26px_rgba(56,189,248,0.7)]"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 lg:px-4 py-2 rounded-full text-[12px] lg:text-[13px] font-semibold tracking-wide uppercase transition-colors ${
                    isActive
                      ? 'bg-white text-slate-950'
                      : 'text-slate-200 hover:bg-white/12'
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
              className="p-2.5 rounded-full border border-white/15 text-slate-100 hover:bg-white/10 transition-colors"
              aria-label="Pesquisar produtos"
            >
              <Search size={19} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full border border-white/15 text-slate-100 hover:bg-white/10 transition-colors"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              onClick={onCartToggle}
              className="relative p-2.5 rounded-full border border-white/15 text-slate-100 hover:bg-white/10 transition-colors"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={19} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-sky-400 text-black text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {!isAuthenticated ? (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              >
                <UserCircle2 size={16} />
                Entrar
              </Link>
            ) : (
              <>
                <Link
                  to={isAdmin ? '/admin' : '/conta'}
                  className="hidden sm:inline-flex items-center gap-2 bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                >
                  {isAdmin ? <ShieldCheck size={16} /> : <UserCircle2 size={16} />}
                  {currentUser?.name?.split(' ')[0] ?? 'Conta'}
                </Link>
                <button
                  onClick={() => {
                    void logout();
                  }}
                  className="hidden sm:inline-flex items-center gap-2 border border-white/20 text-slate-100 px-3 py-2 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </>
            )}

            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="md:hidden p-2.5 rounded-full border border-white/15 text-slate-100 hover:bg-white/10 transition-colors"
              aria-label="Alternar menu"
            >
              {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95">
          <nav className="max-w-[1440px] mx-auto px-4 py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-semibold tracking-wide uppercase transition-colors ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-slate-100 bg-white/5'
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
                className="px-4 py-3 rounded-xl text-sm font-semibold bg-white text-black"
              >
                Entrar na conta
              </Link>
            ) : (
              <button
                onClick={() => {
                  void logout();
                  setIsMenuOpen(false);
                }}
                className="px-4 py-3 rounded-xl text-sm font-semibold border border-white/20 text-slate-100 bg-white/5 text-left"
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
