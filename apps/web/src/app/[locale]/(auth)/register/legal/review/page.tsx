'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { useRegistrationStore } from '@/store/registration.store';
import { useAuthStore } from '@/store/auth.store';

// P1-09: Legal entity — review registration details & submit for Finance review
export default function LegalReviewPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('registerLegalReview');
  const tReg = useTranslations('register');
  const { legalDraft, documentUploads, userId } = useRegistrationStore();
  const { accessToken } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Submit for Finance review — requires authenticated request
      await apiClient.post('/registration/legal/submit');
      router.push(`/${locale}/register/success?type=legal`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? t('submissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!legalDraft) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">{t('noDataFound')}</p>
        <button
          onClick={() => router.push(`/${locale}/register/legal`)}
          className="mt-3 text-pob-blue hover:underline text-sm"
        >
          {t('startRegistration')}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="w-8 h-1.5 rounded-full bg-pob-blue" />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">{t('step5of5')}</span>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-1">{t('title')}</h2>
      <p className="text-gray-500 text-sm mb-5">
        {t('subtitle')}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary card */}
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 mb-5">
        <div className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
            {t('companyInfo')}
          </p>
          <div className="space-y-2">
            <ReviewRow label={t('companyName')} value={legalDraft.companyName} />
            <ReviewRow label={t('taxId')} value={legalDraft.taxRegistrationId} />
            <ReviewRow label={t('contactPerson')} value={legalDraft.contactPersonName} />
            {legalDraft.contactPersonPhone && (
              <ReviewRow label={t('contactPhone')} value={legalDraft.contactPersonPhone} />
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
            {t('loginNotifications')}
          </p>
          <div className="space-y-2">
            {legalDraft.email && <ReviewRow label={t('email')} value={legalDraft.email} />}
            {legalDraft.phone && <ReviewRow label={t('phone')} value={legalDraft.phone} />}
            <ReviewRow
              label={t('language')}
              value={{ AZ: 'Azərbaycan', EN: 'English', RU: 'Русский', TR: 'Türkçe' }[legalDraft.preferredLanguage] ?? legalDraft.preferredLanguage}
            />
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
            {t('documentsUploaded')}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-lg">📁</span>
            <p className="text-sm text-gray-700">
              {t('documentCount', { count: documentUploads.length, plural: documentUploads.length !== 1 ? 's' : '' })}
            </p>
          </div>
        </div>
      </div>

      {/* Declaration */}
      <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors mb-5">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-pob-blue"
        />
        <p className="text-xs text-gray-700 leading-relaxed">
          {t('declarationText')}
        </p>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.back()}
          className="py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={!agreed || submitting}
          className="py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? t('submitting') : t('submitBtn')}
        </button>
      </div>
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right truncate font-medium">{value}</span>
    </div>
  );
}
