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
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all ${
                step === 1 ? 'w-8 bg-pob-blue' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">{t('step1of4')}</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-1">{t('createAccount')}</h2>
      <p className="text-gray-500 text-sm mb-6">
        {t('selectTypePrompt')}
      </p>

      <div className="space-y-3">
        <Link
          href={`/${locale}/register/individual`}
          className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-pob-blue hover:bg-blue-50 transition-all group"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-pob-blue group-hover:text-white transition-all flex-shrink-0">
            👤
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{t('individualTitle')}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('individualSubtitle')}
            </p>
          </div>
          <span className="text-gray-400 group-hover:text-pob-blue mt-1">›</span>
        </Link>

        <Link
          href={`/${locale}/register/legal`}
          className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-pob-blue hover:bg-blue-50 transition-all group"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-pob-blue group-hover:text-white transition-all flex-shrink-0">
            🏢
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800">{t('legalTitle')}</p>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                {t('financeReviewRequired')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('legalSubtitle')}
            </p>
          </div>
          <span className="text-gray-400 group-hover:text-pob-blue mt-1">›</span>
        </Link>
      </div>

      <div className="mt-5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Note:</strong> {t('accountTypeNote')}
        </p>
      </div>

      <p className="mt-5 text-center text-sm text-gray-600">
        {t('alreadyHaveAccount')}{' '}
        <Link href={`/${locale}/login`} className="text-pob-blue hover:underline font-medium">
          {t('signIn')}
        </Link>
      </p>
    </>
  );
}
