'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export function CustomerNav() {
  const locale = useLocale();
  const t = useTranslations('nav');
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  // Block PENDING_REVIEW legal users from accessing customer pages
  useEffect(() => {
    if (user?.accountStatus === 'PENDING_REVIEW' || user?.accountStatus === 'PENDING_EMAIL') {
      router.replace(`/${locale}/register/legal/pending`);
    }
  }, [user?.accountStatus, locale, router]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // swallow
    } finally {
      clearAuth();
      router.push(`/${locale}/login`);
    }
  };

  return (
    <nav className="bg-pob-navy text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-bold text-lg">POB E-Queue</span>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href={`/${locale}/customer/dashboard`} className="hover:text-blue-300 transition-colors">
              {t('dashboard')}
            </Link>
            <Link href={`/${locale}/customer/orders`} className="hover:text-blue-300 transition-colors">
              {t('orders')}
            </Link>
            <Link href={`/${locale}/customer/orders/new`} className="hover:text-blue-300 transition-colors">
              {t('newOrder')}
            </Link>
            <Link href={`/${locale}/customer/profile`} className="hover:text-blue-300 transition-colors">
              {t('profile')}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-200">{user?.email ?? user?.phone}</span>
          <LocaleSwitcher variant="dark" />
          <button
            onClick={handleLogout}
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}
