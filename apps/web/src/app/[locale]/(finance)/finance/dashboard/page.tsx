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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-up">
      {/* Header */}
      <header className="border-b border-parchment-300 pb-5">
        <p className="eyebrow-brass">{t('portalLabel')}</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight text-ink">
          {t('dashboardTitle')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 font-mono tabular-nums">{user?.email}</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          eyebrow={t('pendingReview')}
          value={pendingCount === null ? '—' : pendingCount.toString()}
          loading={pendingCount === null}
          caption={t('legalApplications')}
          tone="brass"
        />
        <StatCard
          eyebrow={t('reviewCycles')}
          value="2"
          caption={t('reviewCyclesDesc')}
          tone="ink"
        />
        <StatCard
          eyebrow={t('sla')}
          value="48h"
          caption={t('slaDesc')}
          tone="sea"
        />
      </div>

      {/* Quick actions + reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link
          href={`/${locale}/registrations`}
          className="group surface p-6 hover:border-brass-400 hover:shadow-admiralty transition-all"
        >
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-brass-50 text-brass-600 group-hover:bg-brass-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zM10.5 14.25h2.25M10.5 18h2.25" />
              </svg>
            </span>
            {pendingCount !== null && pendingCount > 0 && (
              <span className="text-[10px] uppercase tracking-eyebrow font-medium bg-brass-500 text-white px-2.5 py-1 rounded-full tabular-nums">
                {t('waiting', { count: pendingCount })}
              </span>
            )}
          </div>
          <p className="mt-4 eyebrow text-ink-400">Action</p>
          <h3 className="mt-1 font-display text-xl text-ink">{t('reviewRegistrations')}</h3>
          <p className="mt-1.5 text-sm text-ink-500">{t('reviewRegistrationsDesc')}</p>
        </Link>

        <div className="surface p-6">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-parchment-100 text-ink-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </span>
          <p className="mt-4 eyebrow text-ink-400">Reference</p>
          <h3 className="mt-1 font-display text-xl text-ink">{t('brdRules')}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <BrdItem>{t('brdRule1')}</BrdItem>
            <BrdItem>{t('brdRule2')}</BrdItem>
            <BrdItem>{t('brdRule3')}</BrdItem>
            <BrdItem>{t('brdRule4')}</BrdItem>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  caption,
  loading,
  tone,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  loading?: boolean;
  tone: 'brass' | 'ink' | 'sea';
}) {
  const valueClass =
    tone === 'brass' ? 'text-brass-600' : tone === 'sea' ? 'text-sea-600' : 'text-ink';
  return (
    <div className="surface p-5">
      <p className="eyebrow text-ink-400">{eyebrow}</p>
      <p className={`mt-3 font-display text-4xl tabular-nums ${valueClass}`}>
        {loading ? (
          <span className="inline-block w-7 h-7 border-2 border-brass-200 border-t-transparent rounded-full animate-spin align-middle" />
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-xs text-ink-500">{caption}</p>
    </div>
  );
}

function BrdItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className="text-brass-500 mt-1.5 shrink-0">▸</span>
      <span>{children}</span>
    </li>
  );
}
