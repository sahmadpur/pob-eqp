'use client';

import { useAuthStore } from '@/store/auth.store';
import { useTranslations } from 'next-intl';

export default function ParkingCheckerPage() {
  const { user } = useAuthStore();
  const t = useTranslations('operations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('parkingTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('parkingRole')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🅿️</div>
          <p className="text-2xl font-bold text-gray-800">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('occupiedSlots')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🟢</div>
          <p className="text-2xl font-bold text-green-600">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('availableSlots')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-2xl font-bold text-red-600">—</p>
          <p className="text-xs text-gray-400 mt-1">{t('zoneC')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">{t('parkingZones')}</h2>
        <div className="grid grid-cols-3 gap-3 text-sm text-gray-500">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-semibold text-gray-700">Zone A</p>
            <p className="text-xs mt-1">{t('zoneADesc')}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-semibold text-gray-700">Zone B</p>
            <p className="text-xs mt-1">{t('zoneBDesc')}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="font-semibold text-red-700">Zone C</p>
            <p className="text-xs mt-1 text-red-500">{t('zoneCDesc')}</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          {t('parkingDesc')}
        </p>
      </div>
    </div>
  );
}
