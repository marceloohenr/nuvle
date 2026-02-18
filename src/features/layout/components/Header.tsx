import { LogOut, Menu, Moon, Search, ShieldCheck, ShoppingCart, Sun, UserCircle2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useCart } from '../../cart/context/CartContext';
import { useTheme } from '../../theme/context/ThemeContext';
import nuvleLogo from '../../../shared/assets/nuvle-logo-raio.png';

interface HeaderProps {
  onCartToggle: () => void;
  onSearchToggle: () => void;
}

const Header = ({ onCartToggle, onSearchToggle }: HeaderProps) => {
  const { state } = useCart();
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

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

      if (!isAdmin) {
        baseItems.push({ to: '/conta#favoritos', label: 'Favoritos' });
      }
    }

    if (isAdmin) {
      baseItems.push({ to: '/admin', label: 'Admin' });
    }

    return baseItems;
  }, [isAdmin, isAuthenticated]);

  const isNavItemActive = (to: string) => {
    const [path, hashFragment] = to.split('#');
    const expectedHash = hashFragment ? `#${hashFragment}` : '';

    if (expectedHash) {
      return location.pathname === path && location.hash === expectedHash;
    }

    if (path === '/conta') {
      return location.pathname === '/conta' && location.hash !== '#favoritos';
    }

    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const scrollToFavoritesSection = () => {
    if (location.pathname !== '/conta') return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const target = document.getElementById('favoritos');
    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    setIsHeaderVisible(true);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen || typeof window === 'undefined') return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SCROLL_DELTA_THRESHOLD = 1;

    const resolveScrollTop = (target: EventTarget | null) => {
      if (target && target instanceof HTMLElement) {
        return target.scrollTop;
      }
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const handleScroll = (event: Event) => {
      const currentY = Math.max(0, resolveScrollTop(event.target));
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;

      if (isMenuOpen) {
        setIsHeaderVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (delta > SCROLL_DELTA_THRESHOLD) {
        setIsHeaderVisible(false);
      } else if (delta < -SCROLL_DELTA_THRESHOLD) {
        setIsHeaderVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-black/75 backdrop-blur-xl transition-transform duration-300 will-change-transform ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 text-white text-center text-[10px] sm:text-[11px] py-2 px-3 sm:px-4 tracking-[0.08em] sm:tracking-[0.2em] font-semibold uppercase whitespace-nowrap overflow-hidden text-ellipsis">
        Frete rapido | suporte no WhatsApp | trocas facilitadas
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="h-[74px] sm:h-[86px] flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-[130px]">
            <img
              src={nuvleLogo}
              alt="Nuvle"
              className="h-9 sm:h-11 md:h-12 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (item.to === '/conta#favoritos') {
                    scrollToFavoritesSection();
                  }
                }}
                className={`px-3 lg:px-4 py-2 rounded-md text-[12px] lg:text-[13px] font-semibold tracking-wide uppercase transition-colors ${
                  isNavItemActive(item.to)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/80'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onSearchToggle}
              className="p-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
              aria-label="Pesquisar produtos"
            >
              <Search size={19} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              onClick={onCartToggle}
              className="relative p-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
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
                className="hidden sm:inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              >
                <UserCircle2 size={16} />
                Entrar
              </Link>
            ) : (
              <>
                <Link
                  to={isAdmin ? '/admin' : '/conta'}
                  className="hidden sm:inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
                >
                  {isAdmin ? <ShieldCheck size={16} /> : <UserCircle2 size={16} />}
                  {currentUser?.name?.split(' ')[0] ?? 'Conta'}
                </Link>
                <button
                  onClick={() => {
                    void logout();
                  }}
                  className="hidden sm:inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-3 py-2 rounded-md text-sm font-semibold hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </>
            )}

            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="md:hidden p-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
              aria-label="Alternar menu"
            >
              {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[106px] sm:top-[118px] bottom-0 z-40">
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Fechar menu"
          />
          <aside
            className="relative ml-auto h-full w-[88%] max-w-sm border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-black/95 shadow-2xl overflow-y-auto"
            aria-label="Menu mobile"
          >
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                {isAuthenticated ? (
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {currentUser?.name ?? 'Conta logada'}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Navegacao da loja
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Menu otimizado para mobile
                </p>
              </div>

              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      if (item.to === '/conta#favoritos') {
                        scrollToFavoritesSection();
                      }
                      setIsMenuOpen(false);
                    }}
                    className={`px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                      isNavItemActive(item.to)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 bg-slate-100 dark:text-slate-100 dark:bg-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="grid gap-2">
                {!isAuthenticated ? (
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex items-center justify-center px-4 py-3.5 rounded-xl text-sm font-semibold bg-blue-600 text-white"
                  >
                    Entrar na conta
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      void logout();
                      setIsMenuOpen(false);
                    }}
                    className="inline-flex items-center justify-center px-4 py-3.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:bg-slate-900"
                  >
                    Sair da conta
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};

export default Header;
