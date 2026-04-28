'use client';

import { useAuthStore } from '@/store/auth.store';
import { useTranslations } from 'next-intl';

export default function ControlTowerDashboardPage() {
  const { user } = useAuthStore();
  const t = useTranslations('operations');

  const stats = [
    {
      label: t('activeQueue'),
      tone: 'ink' as const,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-6 0V5.25A2.25 2.25 0 017.5 3h6a2.25 2.25 0 012.25 2.25v13.5m0 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-9-2.25h12.75M3 9h18M3 13.5h18" />
      ),
    },
    {
      label: t('trucksInPort'),
      tone: 'sea' as const,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
      ),
    },
    {
      label: t('pendingGateEntry'),
      tone: 'brass' as const,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      ),
    },
    {
      label: t('noShowAlerts'),
      tone: 'wine' as const,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="border-b border-parchment-300 pb-5">
        <p className="eyebrow-brass">{t('controlTowerRole')}</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight text-ink">
          {t('controlTowerTitle')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 font-mono tabular-nums">{user?.email}</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const valueClass =
            s.tone === 'sea'
              ? 'text-sea-600'
              : s.tone === 'brass'
                ? 'text-brass-600'
                : s.tone === 'wine'
                  ? 'text-wine-500'
                  : 'text-ink';
          return (
            <div key={s.label} className="surface p-5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-parchment-100 text-ink-700 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  {s.icon}
                </svg>
              </span>
              <p className={`font-display text-3xl tabular-nums ${valueClass}`}>—</p>
              <p className="mt-1 eyebrow text-ink-400 truncate">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="surface p-6">
        <p className="eyebrow text-ink-400">Coming soon</p>
        <h2 className="mt-1 font-display text-xl text-ink">{t('queueManagement')}</h2>
        <p className="mt-2 text-sm text-ink-500 leading-relaxed max-w-2xl">
          {t('queueManagementDesc')}
        </p>
      </div>
    </div>
  );
}
