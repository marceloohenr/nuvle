import {
  AtSign,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  PhoneCall,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../settings';
import nuvleLogo from '../../../shared/assets/nuvle-logo-neon.svg';

const socialPlatforms = [
  { id: 'tiktok', label: 'TikTok', Icon: Music2 },
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
  { id: 'x', label: 'X', Icon: X },
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { id: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
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
    <footer className="border-t border-white/10 bg-black/65 mt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <img
              src={nuvleLogo}
              alt="Nuvle"
              className="h-10 w-auto drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
            />
            <p className="mt-3 text-sm text-slate-300 max-w-sm">
              Loja virtual de roupas com foco em estilo, conforto e atendimento direto.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
              Navegacao
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/produtos"
                  className="text-slate-200 hover:text-cyan-300"
                >
                  Produtos
                </Link>
              </li>
              <li>
                <Link
                  to="/pedidos"
                  className="text-slate-200 hover:text-cyan-300"
                >
                  Meus pedidos
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-slate-200 hover:text-cyan-300"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
              Contato
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-100">
              {settings.contactVisibility.whatsapp && (
                <li className="flex items-center gap-2">
                  <PhoneCall size={15} />
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-cyan-300"
                    >
                      WhatsApp: {settings.contact.whatsappLabel}
                    </a>
                  ) : (
                    <span>WhatsApp: {settings.contact.whatsappLabel}</span>
                  )}
                </li>
              )}
              {settings.contactVisibility.email && (
                <li className="flex items-center gap-2">
                  <Mail size={15} />
                  <a
                    href={`mailto:${settings.contact.email}`}
                    className="hover:text-cyan-300"
                  >
                    {settings.contact.email}
                  </a>
                </li>
              )}
              {settings.contactVisibility.handle && (
                <li className="flex items-center gap-2">
                  <AtSign size={15} />
                  {instagramHref ? (
                    <a
                      href={instagramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-cyan-300"
                    >
                      {settings.contact.handle}
                    </a>
                  ) : (
                    <span>{settings.contact.handle}</span>
                  )}
                </li>
              )}
            </ul>

            {settings.showSocialIcons && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialPlatforms.map((platform) => {
                  if (!settings.socialVisibility[platform.id]) {
                    return null;
                  }

                  const href = normalizeExternalHref(settings.socialLinks[platform.id]);

                  if (!href) {
                    return (
                      <span
                        key={platform.id}
                        title={platform.label}
                        className="inline-flex items-center justify-center rounded-full border border-white/15 h-10 w-10 text-slate-500"
                      >
                        <platform.Icon size={18} />
                        <span className="sr-only">{platform.label}</span>
                      </span>
                    );
                  }

                  return (
                    <a
                      key={platform.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={platform.label}
                      title={platform.label}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 h-10 w-10 text-slate-200 hover:border-cyan-300 hover:text-cyan-300 transition-colors"
                    >
                      <platform.Icon size={18} />
                      <span className="sr-only">{platform.label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-slate-400">
          <p>(c) {currentYear} Nuvle. Todos os direitos reservados.</p>
          {channelsHref ? (
            <a
              href={channelsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-300"
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
