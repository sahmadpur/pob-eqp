'use client';

import { useAuthStore } from '@/store/auth.store';
import { useTranslations } from 'next-intl';

export default function TerminalOperatorPage() {
  const { user } = useAuthStore();
  const t = useTranslations('operations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('terminalTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('terminalRole')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🏭</div>
          <p className="text-2xl font-bold text-gray-800">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('activeVessels')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">📦</div>
          <p className="text-2xl font-bold text-blue-600">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('trucksLoading')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-2xl font-bold text-green-600">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('loadedToday')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">{t('terminalManifest')}</h2>
        <p className="text-gray-400 text-sm">
          {t('terminalManifestDesc')}
        </p>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs font-semibold text-amber-700">{t('brdRule')}</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {t('manifestBrdRule')}
          </p>
        </div>
      </div>
    </div>
  );
}
