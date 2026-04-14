'use client';

import { useAuthStore } from '@/store/auth.store';
import { useTranslations } from 'next-intl';

export default function ControlTowerDashboardPage() {
  const { user } = useAuthStore();
  const t = useTranslations('operations');

  const stats = [
    { label: t('activeQueue'),      value: '—', icon: '🚛', color: 'text-blue-600' },
    { label: t('trucksInPort'),     value: '—', icon: '⚓', color: 'text-green-600' },
    { label: t('pendingGateEntry'), value: '—', icon: '🚧', color: 'text-amber-600' },
    { label: t('noShowAlerts'),     value: '—', icon: '⚠️', color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('controlTowerTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('controlTowerRole')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">{t('queueManagement')}</h2>
        <p className="text-gray-400 text-sm">
          {t('queueManagementDesc')}
        </p>
      </div>
    </div>
  );
}
