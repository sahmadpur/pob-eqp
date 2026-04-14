'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

export default function FinanceDashboardPage() {
  const locale = useLocale();
  const { user } = useAuthStore();
  const t = useTranslations('finance');
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: unknown[] }>('/registration/finance/pending')
      .then((res) => setPendingCount(res.data.data.length))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('dashboardTitle')}</h1>
        <p className="text-gray-500 text-sm mt-1">{user?.email} · {t('portalLabel')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('pendingReview')}</p>
          <p className="text-3xl font-bold text-amber-500">
            {pendingCount === null ? (
              <span className="inline-block w-8 h-8 border-2 border-amber-300 border-t-transparent rounded-full animate-spin align-middle" />
            ) : pendingCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('legalApplications')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('reviewCycles')}</p>
          <p className="text-3xl font-bold text-gray-800">2</p>
          <p className="text-xs text-gray-400 mt-1">{t('reviewCyclesDesc')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('sla')}</p>
          <p className="text-3xl font-bold text-green-600">48h</p>
          <p className="text-xs text-gray-400 mt-1">{t('slaDesc')}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/${locale}/registrations`}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-lg text-gray-800 group-hover:text-amber-600 transition-colors">
            {t('reviewRegistrations')}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {t('reviewRegistrationsDesc')}
          </p>
          {pendingCount !== null && pendingCount > 0 && (
            <span className="inline-block mt-3 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {t('waiting', { count: pendingCount })}
            </span>
          )}
        </Link>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-3xl mb-3">📜</div>
          <h3 className="font-semibold text-lg text-gray-800">{t('brdRules')}</h3>
          <ul className="text-gray-500 text-sm mt-2 space-y-1">
            <li>• {t('brdRule1')}</li>
            <li>• {t('brdRule2')}</li>
            <li>• {t('brdRule3')}</li>
            <li>• {t('brdRule4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
