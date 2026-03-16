'use client';

import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function CustomerDashboardPage() {
  const { user } = useAuthStore();
  const locale = useLocale();
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('welcome')}</h1>
        <p className="text-gray-500 mt-1">{user?.email ?? user?.phone}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/${locale}/customer/orders/new`}
          className="p-6 bg-pob-blue text-white rounded-xl hover:bg-pob-blue-light transition-colors"
        >
          <div className="text-3xl mb-2">📦</div>
          <h3 className="font-semibold text-lg">{t('newOrder')}</h3>
          <p className="text-blue-200 text-sm mt-1">{t('newOrderDesc')}</p>
        </Link>

        <Link
          href={`/${locale}/customer/orders`}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:border-pob-blue hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-2">📋</div>
          <h3 className="font-semibold text-lg text-gray-800">{t('myOrders')}</h3>
          <p className="text-gray-500 text-sm mt-1">{t('myOrdersDesc')}</p>
        </Link>

        <Link
          href={`/${locale}/customer/profile`}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:border-pob-blue hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-2">👤</div>
          <h3 className="font-semibold text-lg text-gray-800">{t('profile')}</h3>
          <p className="text-gray-500 text-sm mt-1">{t('profileDesc')}</p>
        </Link>
      </div>
    </div>
  );
}
