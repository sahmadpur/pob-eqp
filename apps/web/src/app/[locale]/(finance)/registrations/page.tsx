'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RegistrationStatus } from '@pob-eqp/shared';

interface PendingRegistration {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  legalProfile: {
    id: string;
    companyName: string;
    taxRegistrationId: string;
    contactPersonName: string;
    registrationStatus: string;
    updatedAt: string;
    documents: Array<{ id: string; documentType: string; fileName: string }>;
    reviews: Array<{ action: string; createdAt: string }>;
  } | null;
}

// P1-F01: Finance Officer — list of pending legal entity registrations
export default function FinancePendingRegistrationsPage() {
  const locale = useLocale();
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiClient.get<{ data: PendingRegistration[] }>(
          '/registration/finance/pending',
        );
        setRegistrations(res.data.data);
      } catch {
        setError('Failed to load pending registrations.');
      } finally {
        setLoading(false);
      }
    };
    void fetchPending();
  }, []);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.legalProfile?.companyName.toLowerCase().includes(q) ||
      r.legalProfile?.taxRegistrationId.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q)
    );
  });

  const getWaitingDays = (submittedAt: string) => {
    const diff = Date.now() - new Date(submittedAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pending Registrations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Legal entity accounts awaiting Finance review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
            {registrations.length} pending
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, VÖEN, email or phone..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-gray-500 font-medium">
            {search ? 'No results for your search.' : 'No pending registrations.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-sm text-pob-blue hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  VÖEN
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Docs
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Waiting
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cycle
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((reg) => {
                const lp = reg.legalProfile;
                if (!lp) return null;
                const waitDays = getWaitingDays(lp.updatedAt);
                const reviewCycle = (lp.reviews?.length ?? 0) + 1;
                const isUrgent = waitDays >= 2;

                return (
                  <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isUrgent && (
                          <span title="Waiting 2+ days" className="text-amber-500 text-xs">⚠</span>
                        )}
                        <span className="font-medium text-gray-800 truncate max-w-[160px]">
                          {lp.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {lp.taxRegistrationId}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 text-xs">{lp.contactPersonName}</p>
                      <p className="text-gray-400 text-xs">{reg.email ?? reg.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          lp.documents.length >= 2
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {lp.documents.length} file{lp.documents.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          isUrgent ? 'text-amber-600' : 'text-gray-500'
                        }`}
                      >
                        {waitDays === 0 ? 'Today' : `${waitDays}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">#{reviewCycle}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/${locale}/registrations/${reg.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-pob-blue hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          Showing {filtered.length} of {registrations.length} pending registrations
        </p>
      )}
    </div>
  );
}
