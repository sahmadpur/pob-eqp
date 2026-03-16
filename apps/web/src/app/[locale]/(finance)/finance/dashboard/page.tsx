'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

export default function FinanceDashboardPage() {
  const locale = useLocale();
  const { user } = useAuthStore();
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
        <h1 className="text-2xl font-bold text-gray-800">Finance Officer Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{user?.email} · Finance Officer Portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pending Review</p>
          <p className="text-3xl font-bold text-amber-500">
            {pendingCount === null ? (
              <span className="inline-block w-8 h-8 border-2 border-amber-300 border-t-transparent rounded-full animate-spin align-middle" />
            ) : pendingCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Legal entity applications</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Review Cycles</p>
          <p className="text-3xl font-bold text-gray-800">2</p>
          <p className="text-xs text-gray-400 mt-1">Maximum allowed (BRD)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">SLA</p>
          <p className="text-3xl font-bold text-green-600">48h</p>
          <p className="text-xs text-gray-400 mt-1">Target review turnaround</p>
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
            Review Registrations
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Review and approve or reject pending legal entity applications
          </p>
          {pendingCount !== null && pendingCount > 0 && (
            <span className="inline-block mt-3 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pendingCount} waiting
            </span>
          )}
        </Link>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-3xl mb-3">📜</div>
          <h3 className="font-semibold text-lg text-gray-800">BRD Rules</h3>
          <ul className="text-gray-500 text-sm mt-2 space-y-1">
            <li>• Max <strong>2 review cycles</strong> per registration</li>
            <li>• Rejection must include a written reason</li>
            <li>• Documents verified against company profile</li>
            <li>• Approved → account status set to <strong>ACTIVE</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
