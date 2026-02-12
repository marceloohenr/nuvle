import { Instagram, Mail, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">NUVLE</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 max-w-sm">
              Loja virtual de roupas com foco em estilo, conforto e atendimento
              direto.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Navegacao
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/produtos"
                  className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Produtos
                </Link>
              </li>
              <li>
                <Link
                  to="/pedidos"
                  className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Meus pedidos
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Contato
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-center gap-2">
                <PhoneCall size={15} />
                WhatsApp: (81) 98896-6556
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} />
                nuvleoficial@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <Instagram size={15} />
                @nuvleoficial
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
          <p>(c) {currentYear} Nuvle. Todos os direitos reservados.</p>
          <a
            href="https://linktr.ee/nuvle"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Canais oficiais
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
