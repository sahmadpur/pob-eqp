'use client';

import { useAuthStore } from '@/store/auth.store';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const locale = useLocale();
  const t = useTranslations('admin');

  const tiles = [
    { href: `/${locale}/admin/registrations`, emoji: '📋', label: t('registrations'), desc: t('registrationsDesc') },
    { href: `/${locale}/admin/users`, emoji: '👥', label: t('users'), desc: t('usersDesc') },
    { href: `/${locale}/admin/planning`, emoji: '📅', label: t('planning'), desc: t('planningDesc') },
    { href: `/${locale}/admin/system`, emoji: '⚙️', label: t('systemConfig'), desc: t('systemConfigDesc') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('administrator')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{tile.emoji}</div>
            <h3 className="font-semibold text-lg text-gray-800">{tile.label}</h3>
            <p className="text-gray-500 text-sm mt-1">{tile.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
