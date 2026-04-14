'use client';

import { useAuthStore } from '@/store/auth.store';
import { useTranslations } from 'next-intl';

export default function BorderOfficerPage() {
  const { user } = useAuthStore();
  const t = useTranslations('operations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('borderTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('borderRole')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🛂</div>
          <p className="text-2xl font-bold text-gray-800">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('pendingClearance')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-2xl font-bold text-green-600">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('clearedToday')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🚫</div>
          <p className="text-2xl font-bold text-red-600">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('holdsFlags')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">{t('docVerification')}</h2>
        <p className="text-gray-400 text-sm">
          {t('docVerificationDesc')}
        </p>
      </div>
    </div>
  );
}
