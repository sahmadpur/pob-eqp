'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Crest } from '@/components/brand/crest';

export function FinanceHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('financeHeader');
  const router = useRouter();
  const { user, clearAuth, refreshToken } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {}
    clearAuth();
    router.push(`/${locale}/login`);
  };

  const links = [
    { href: `/${locale}/finance/dashboard`, label: t('dashboard') },
    { href: `/${locale}/finance/orders`, label: t('orders') },
    { href: `/${locale}/registrations`, label: t('registrations') },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <header className="bg-white border-b border-parchment-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href={`/${locale}/finance/dashboard`} className="flex items-center gap-3 group min-w-0">
          <span className="text-ink-800 group-hover:text-brass-600 transition-colors shrink-0">
            <Crest className="w-7 h-7" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base text-ink leading-none tracking-tight">
              Port of Baku
            </p>
            <p className="eyebrow-brass mt-0.5">{t('portalLabel')}</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isActive(link.href)
                  ? 'text-ink bg-brass-50 border border-brass-200'
                  : 'text-ink-600 hover:text-ink hover:bg-parchment-100 border border-transparent'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden lg:inline text-xs text-ink-400 font-mono truncate max-w-[200px]">
            {user?.email}
          </span>
          <LocaleSwitcher variant="light" />
          <button
            onClick={() => void handleLogout()}
            className="text-xs uppercase tracking-eyebrow font-medium bg-parchment-100 hover:bg-parchment-200 text-ink-700 px-3 py-1.5 rounded-md transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
