'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface LegalRegistration {
  id: string;
  email: string | null;
  phone: string | null;
  accountStatus: string;
  createdAt: string;
  legalProfile: {
    id: string;
    companyName: string;
    taxRegistrationId: string;
    contactPersonName: string;
    registrationStatus: string;
    submittedAt: string | null;
    updatedAt: string;
    registrationReviews: Array<{ action: string; createdAt: string }>;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
};

export default function AdminRegistrationsPage() {
  const locale = useLocale();
  const t = useTranslations('adminRegistrations');
  const [registrations, setRegistrations] = useState<LegalRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await apiClient.get<{ data: LegalRegistration[] }>('/registration/admin/all');
        setRegistrations(res.data.data);
      } catch {
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, []);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.legalProfile?.companyName.toLowerCase().includes(q) ||
      r.legalProfile?.taxRegistrationId.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q);
    const matchesStatus =
      statusFilter === 'ALL' || r.legalProfile?.registrationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = registrations.reduce<Record<string, number>>(
    (acc, r) => {
      const s = r.legalProfile?.registrationStatus ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {},
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        <span className="bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
          {t('totalCount', { count: registrations.length })}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'DECLINED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === 'ALL' ? t('all') : t(`status${s}`)}
            {s !== 'ALL' && counts[s] != null && (
              <span className="ml-1.5 opacity-70">{counts[s]}</span>
            )}
            {s === 'ALL' && (
              <span className="ml-1.5 opacity-70">{registrations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 font-medium">
            {search || statusFilter !== 'ALL' ? t('noResults') : t('noRegistrations')}
          </p>
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              className="mt-2 text-sm text-pob-blue hover:underline"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('colCompany')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('colVoen')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('colContact')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('colStatus')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('colRegistered')}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((reg) => {
                const lp = reg.legalProfile;
                const status = lp?.registrationStatus ?? 'UNKNOWN';
                return (
                  <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800 truncate max-w-[180px] block">
                        {lp?.companyName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {lp?.taxRegistrationId ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 text-xs">{lp?.contactPersonName ?? '—'}</p>
                      <p className="text-gray-400 text-xs">{reg.email ?? reg.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {t(`status${status}` as Parameters<typeof t>[0], undefined, { fallback: status })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(reg.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lp && (
                        <Link
                          href={`/${locale}/admin/registrations/${reg.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-pob-blue hover:underline"
                        >
                          {t('viewLink')}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {t('showingCount', { filtered: filtered.length, total: registrations.length })}
        </p>
      )}
    </div>
  );
}
