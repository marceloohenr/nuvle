import { AtSign, Mail, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../settings';

const socialPlatforms = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const;

const normalizeExternalHref = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { settings } = useStoreSettings();

  const whatsappHref = normalizeExternalHref(
    settings.contact.whatsappUrl || settings.socialLinks.whatsapp
  );
  const instagramHref = normalizeExternalHref(settings.socialLinks.instagram);
  const channelsHref =
    normalizeExternalHref(settings.socialLinks.instagram) ||
    normalizeExternalHref(settings.socialLinks.tiktok) ||
    normalizeExternalHref(settings.socialLinks.facebook) ||
    normalizeExternalHref(settings.socialLinks.linkedin) ||
    normalizeExternalHref(settings.socialLinks.x) ||
    normalizeExternalHref(settings.socialLinks.whatsapp) ||
    whatsappHref;

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">NUVLE</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 max-w-sm">
              Loja virtual de roupas com foco em estilo, conforto e atendimento direto.
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
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    WhatsApp: {settings.contact.whatsappLabel}
                  </a>
                ) : (
                  <span>WhatsApp: {settings.contact.whatsappLabel}</span>
                )}
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} />
                <a
                  href={`mailto:${settings.contact.email}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {settings.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <AtSign size={15} />
                {instagramHref ? (
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {settings.contact.handle}
                  </a>
                ) : (
                  <span>{settings.contact.handle}</span>
                )}
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {socialPlatforms.map((platform) => {
                const href = normalizeExternalHref(settings.socialLinks[platform.id]);

                if (!href) {
                  return (
                    <span
                      key={platform.id}
                      className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500"
                    >
                      {platform.label}
                    </span>
                  );
                }

                return (
                  <a
                    key={platform.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {platform.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
          <p>(c) {currentYear} Nuvle. Todos os direitos reservados.</p>
          {channelsHref ? (
            <a
              href={channelsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Canais oficiais
            </a>
          ) : (
            <span>Canais oficiais</span>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
