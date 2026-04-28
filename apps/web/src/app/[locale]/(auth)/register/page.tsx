'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

// P1-01: Account type selection
export default function RegisterChoicePage() {
  const locale = useLocale();
  const t = useTranslations('register');

  return (
    <>
      {/* Step progress */}
      <div className="flex items-center gap-2 mb-7">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1 rounded-full transition-all ${
                step === 1 ? 'w-9 bg-brass-500' : 'w-4 bg-parchment-300'
              }`}
            />
          ))}
        </div>
        <span className="ml-2 eyebrow text-ink-400">{t('step1of4')}</span>
      </div>

      <p className="eyebrow-brass">New Customer</p>
      <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-ink">
        {t('createAccount')}
      </h2>
      <p className="mt-2 text-sm text-ink-500">{t('selectTypePrompt')}</p>

      <div className="mt-7 space-y-3">
        <Link
          href={`/${locale}/register/individual`}
          className="group flex items-start gap-4 p-4 border border-parchment-300 hover:border-brass-400 rounded-xl bg-white hover:bg-brass-50/40 transition-all"
        >
          <span className="w-11 h-11 rounded-lg bg-parchment-100 group-hover:bg-brass-100 flex items-center justify-center text-ink-600 group-hover:text-brass-700 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink">{t('individualTitle')}</p>
            <p className="text-sm text-ink-500 mt-0.5">{t('individualSubtitle')}</p>
          </div>
          <svg className="w-4 h-4 text-ink-300 group-hover:text-brass-600 transition-colors mt-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        <Link
          href={`/${locale}/register/legal`}
          className="group flex items-start gap-4 p-4 border border-parchment-300 hover:border-brass-400 rounded-xl bg-white hover:bg-brass-50/40 transition-all"
        >
          <span className="w-11 h-11 rounded-lg bg-parchment-100 group-hover:bg-brass-100 flex items-center justify-center text-ink-600 group-hover:text-brass-700 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-ink">{t('legalTitle')}</p>
              <span className="text-[10px] uppercase tracking-eyebrow font-medium bg-brass-100 text-brass-700 px-2 py-0.5 rounded-full">
                {t('financeReviewRequired')}
              </span>
            </div>
            <p className="text-sm text-ink-500 mt-0.5">{t('legalSubtitle')}</p>
          </div>
          <svg className="w-4 h-4 text-ink-300 group-hover:text-brass-600 transition-colors mt-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      <div className="mt-5 p-3.5 bg-parchment-100 border border-parchment-300 rounded-xl">
        <p className="text-xs text-ink-600 leading-relaxed">
          <span className="font-medium text-ink-800">Note · </span>
          {t('accountTypeNote')}
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-ink-600">
        {t('alreadyHaveAccount')}{' '}
        <Link
          href={`/${locale}/login`}
          className="font-medium text-ink-800 hover:text-brass-600 transition-colors underline-offset-4 hover:underline"
        >
          {t('signIn')}
        </Link>
      </p>
    </>
  );
}
