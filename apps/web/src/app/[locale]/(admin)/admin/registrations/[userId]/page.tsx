'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Document {
  id: string;
  type: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  s3Key: string;
  createdAt: string;
}

interface Review {
  id: string;
  action: string;
  declineReason: string | null;
  cycleNumber: number;
  createdAt: string;
}

interface RegistrationDetail {
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
    contactPersonPhone: string | null;
    registrationStatus: string;
    documents: Document[];
    registrationReviews: Review[];
  } | null;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
};

const DOCUMENT_LABELS: Record<string, string> = {
  COMPANY_REGISTRATION: 'Company Registration Certificate',
  TAX_CERTIFICATE: 'Tax Registration Certificate (VÖEN)',
  CONTRACT: 'Port Contract',
  NATIONAL_ID: 'National ID / Passport',
  OTHER: 'Supporting Document',
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AdminRegistrationDetailPage() {
  const locale = useLocale();
  const t = useTranslations('adminRegistrations');
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [data, setData] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get<{ data: RegistrationDetail }>(
          `/registration/finance/${userId}`,
        );
        setData(res.data.data);
      } catch {
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    void fetchDetail();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.legalProfile) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-sm mb-3">{error ?? t('notFound')}</p>
        <Link href={`/${locale}/admin/registrations`} className="text-pob-blue hover:underline text-sm">
          {t('backToList')}
        </Link>
      </div>
    );
  }

  const lp = data.legalProfile;
  const status = lp.registrationStatus;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/admin/registrations`}
          className="text-gray-400 hover:text-gray-700 transition-colors text-lg"
        >
          ←
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{lp.companyName}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}
            >
              {t(`status${status}` as Parameters<typeof t>[0], undefined, { fallback: status })}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{t('detailSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company info */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
            {t('companyInfo')}
          </h2>
          <dl className="space-y-3">
            {[
              { label: t('companyName'), value: lp.companyName },
              { label: t('taxId'), value: lp.taxRegistrationId },
              { label: t('contactPerson'), value: lp.contactPersonName },
              { label: t('contactPhone'), value: lp.contactPersonPhone ?? '—' },
              { label: t('email'), value: data.email ?? '—' },
              { label: t('phone'), value: data.phone ?? '—' },
              { label: t('accountStatus'), value: data.accountStatus },
              {
                label: t('registered'),
                value: new Date(data.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                }),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</dt>
                <dd className="text-sm text-gray-800 font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Documents */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
            {t('uploadedDocs', { count: lp.documents.length })}
          </h2>
          {lp.documents.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t('noDocs')}</p>
          ) : (
            <div className="space-y-3">
              {lp.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="text-2xl flex-shrink-0">
                    {doc.mimeType === 'application/pdf' ? '📄' : '🖼️'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.originalFileName}</p>
                    <p className="text-xs text-gray-500">
                      {DOCUMENT_LABELS[doc.type] ?? doc.type} · {formatFileSize(doc.fileSizeBytes)}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(`${API_BASE}/files/${doc.s3Key}`, '_blank')}
                    className="flex-shrink-0 text-xs text-pob-blue hover:underline font-medium"
                  >
                    {t('viewDoc')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Review history */}
      {lp.registrationReviews.length > 0 && (
        <section className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
            {t('reviewHistory')}
          </h2>
          <div className="space-y-3">
            {lp.registrationReviews.map((review) => (
              <div
                key={review.id}
                className={`p-3 rounded-lg border ${
                  review.action === 'DECLINE'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase ${
                      review.action === 'DECLINE' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {review.action === 'DECLINE' ? t('rejected') : t('approved')}
                    {review.cycleNumber ? ` (Cycle ${review.cycleNumber})` : ''}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.declineReason && (
                  <p className="text-sm text-gray-700 mt-1">{review.declineReason}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
