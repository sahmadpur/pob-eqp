'use client';

import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function CustomerDashboardPage() {
  const { user } = useAuthStore();
  const locale = useLocale();
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <header className="border-b border-parchment-300 pb-5">
        <p className="eyebrow-brass">Customer Portal</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight text-ink">
          {t('welcome')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 font-mono tabular-nums">
          {user?.email ?? user?.phone}
        </p>
      </header>

      {/* Primary tile + secondary tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary — New Order — full ink/brass treatment */}
        <Link
          href={`/${locale}/customer/orders/new`}
          className="group relative lg:col-span-1 overflow-hidden bg-ink-800 text-parchment-50 rounded-xl p-6 hover:bg-ink-700 transition-colors"
        >
          <span aria-hidden className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brass-500/15 blur-2xl" />
          <span className="relative inline-flex items-center justify-center w-11 h-11 rounded-lg bg-brass-500/20 text-brass-300 mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5V21m6-7.5V21m-6 0h6m-9-9h12a1.5 1.5 0 011.5 1.5V21H4.5V13.5A1.5 1.5 0 016 12zM6 12V7.5A1.5 1.5 0 017.5 6h9A1.5 1.5 0 0118 7.5V12M9 6V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V6" />
            </svg>
          </span>
          <p className="eyebrow-brass text-brass-300/90">Action</p>
          <h3 className="mt-1 font-display text-2xl leading-tight">{t('newOrder')}</h3>
          <p className="mt-2 text-sm text-parchment-200/75 leading-relaxed">{t('newOrderDesc')}</p>
          <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm text-brass-200 group-hover:gap-2.5 transition-all">
            Begin booking
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </Link>

        {/* Secondary — My Orders */}
        <Link
          href={`/${locale}/customer/orders`}
          className="group surface p-6 hover:border-brass-400 hover:shadow-admiralty transition-all"
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-parchment-100 text-ink-700 group-hover:bg-brass-100 group-hover:text-brass-700 transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m4.5 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </span>
          <p className="eyebrow text-ink-400">Overview</p>
          <h3 className="mt-1 font-display text-xl text-ink leading-tight">{t('myOrders')}</h3>
          <p className="mt-2 text-sm text-ink-500">{t('myOrdersDesc')}</p>
        </Link>

        {/* Tertiary — Profile */}
        <Link
          href={`/${locale}/customer/profile`}
          className="group surface p-6 hover:border-brass-400 hover:shadow-admiralty transition-all"
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-parchment-100 text-ink-700 group-hover:bg-brass-100 group-hover:text-brass-700 transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </span>
          <p className="eyebrow text-ink-400">Account</p>
          <h3 className="mt-1 font-display text-xl text-ink leading-tight">{t('profile')}</h3>
          <p className="mt-2 text-sm text-ink-500">{t('profileDesc')}</p>
        </Link>
      </div>
    </div>
  );
}
