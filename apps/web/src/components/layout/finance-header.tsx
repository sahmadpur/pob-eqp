'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export function FinanceHeader() {
  const locale = useLocale();
  const t = useTranslations('financeHeader');
  const router = useRouter();
  const { user, clearAuth, refreshToken } = useAuthStore();

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout', { refreshToken }); } catch {}
    clearAuth();
    router.push(`/${locale}/login`);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚓</span>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Port of Baku EQP</p>
          <p className="text-xs text-amber-600 font-medium">{t('portalLabel')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href={`/${locale}/finance/dashboard`}
            className="text-gray-600 hover:text-pob-blue transition-colors"
          >
            {t('dashboard')}
          </Link>
          <Link
            href={`/${locale}/finance/orders`}
            className="text-gray-600 hover:text-pob-blue transition-colors"
          >
            {t('orders')}
          </Link>
          <Link
            href={`/${locale}/registrations`}
            className="text-gray-600 hover:text-pob-blue transition-colors"
          >
            {t('registrations')}
          </Link>
        </nav>
        <span className="text-sm text-gray-400">{user?.email}</span>
        <LocaleSwitcher variant="light" />
        <button
          onClick={() => void handleLogout()}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          {t('logout')}
        </button>
      </div>
    </header>
  );
}
