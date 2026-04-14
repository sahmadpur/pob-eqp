'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Document {
  id: string;
  type: string;             // Prisma field name (not documentType)
  originalFileName: string; // Prisma field name (not fileName)
  fileSizeBytes: number;    // Prisma field name (not fileSize)
  mimeType: string;         // Prisma field name (not contentType)
  s3Key: string;
  createdAt: string;
}

interface Review {
  id: string;
  action: string;           // 'APPROVE' | 'DECLINE' (not 'REJECT')
  declineReason: string | null; // Prisma field name (not reason)
  cycleNumber: number;
  createdAt: string;
}

interface RegistrationDetail {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  legalProfile: {
    id: string;
    companyName: string;
    taxRegistrationId: string;
    contactPersonName: string;
    contactPersonPhone: string | null;
    registrationStatus: string;
    updatedAt: string;
    documents: Document[];
    registrationReviews: Review[]; // Prisma relation name (not reviews)
  } | null;
}

type Action = 'APPROVE' | 'REJECT' | null;

// Base URL for the files endpoint (no trailing slash, compile-time constant)
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

// P1-F02: Finance Officer — registration review detail
export default function FinanceReviewDetailPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('financeReview');
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [data, setData] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Checklist state (Finance review checklist — 4 items per BRD)
  const [checklist, setChecklist] = useState({
    companyNameVerified: false,
    taxIdVerified: false,
    documentsLegible: false,
    noSuspiciousActivity: false,
  });

  useEffect(() => {
    const fetch = async () => {
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
    void fetch();
  }, [userId]);

  const openDocument = (s3Key: string) => {
    // Files are served directly by FilesController at GET /api/v1/files/:key
    window.open(`${API_BASE}/files/${s3Key}`, '_blank');
  };

  const allChecked = Object.values(checklist).every(Boolean);
  const canApprove = allChecked;
  const canReject = rejectReason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!action) return;
    if (action === 'REJECT' && !canReject) {
      setSubmitError(t('rejectReasonMin'));
      return;
    }
    if (action === 'APPROVE' && !canApprove) {
      setSubmitError(t('completeChecklistFirst'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post(`/registration/finance/${userId}/review`, {
        action,
        reason: action === 'REJECT' ? rejectReason : undefined,
      });
      router.push(`/${locale}/registrations`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSubmitError(axiosErr.response?.data?.message ?? t('submissionFailed'));
    } finally {
      setSubmitting(false);
    }
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
        <Link href={`/${locale}/registrations`} className="text-pob-blue hover:underline text-sm">
          {t('backToList')}
        </Link>
      </div>
    );
  }

  const lp = data.legalProfile;
  const previousReviews = lp.registrationReviews ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/registrations`}
          className="text-gray-400 hover:text-gray-700 transition-colors text-lg"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{lp.companyName}</h1>
          <p className="text-gray-500 text-sm">{t('subtitle')}</p>
        </div>
        {previousReviews.length > 0 && (
          <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {t('resubmission', { count: previousReviews.length + 1 })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Company info + documents */}
        <div className="lg:col-span-2 space-y-5">
          {/* Company details */}
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
                        {DOCUMENT_LABELS[doc.type] ?? doc.type} ·{' '}
                        {formatFileSize(doc.fileSizeBytes)}
                      </p>
                    </div>
                    <button
                      onClick={() => openDocument(doc.s3Key)}
                      className="flex-shrink-0 text-xs text-pob-blue hover:underline font-medium"
                    >
                      {t('viewDoc')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Previous reviews */}
          {previousReviews.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
                {t('reviewHistory')}
              </h2>
              <div className="space-y-3">
                {previousReviews.map((review, i) => (
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
                        {review.cycleNumber ? ` (${t('cycle', { num: review.cycleNumber })})` : ''}
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

        {/* Right: Review panel */}
        <div className="space-y-5">
          {/* Verification checklist */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
              {t('verificationChecklist')}
            </h2>
            <div className="space-y-3">
              {(
                [
                  ['companyNameVerified', t('checkCompanyName')],
                  ['taxIdVerified', t('checkTaxId')],
                  ['documentsLegible', t('checkDocs')],
                  ['noSuspiciousActivity', t('checkNoFraud')],
                ] as [keyof typeof checklist, string][]
              ).map(([key, label]) => (
                <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-pob-blue flex-shrink-0"
                  />
                  <span className="text-xs text-gray-700 group-hover:text-gray-900 leading-relaxed">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {allChecked && (
              <p className="mt-3 text-xs text-green-600 font-medium flex items-center gap-1">
                <span>✓</span> {t('allVerified')}
              </p>
            )}
          </section>

          {/* Decision */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
              {t('decision')}
            </h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setAction('APPROVE')}
                className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  action === 'APPROVE'
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'border-green-300 text-green-700 hover:bg-green-50'
                }`}
              >
                {t('approveBtn')}
              </button>
              <button
                onClick={() => setAction('REJECT')}
                className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  action === 'REJECT'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-red-300 text-red-700 hover:bg-red-50'
                }`}
              >
                {t('rejectBtn')}
              </button>
            </div>

            {action === 'REJECT' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('rejectionReason')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder={t('rejectionPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {t('charsMin', { count: rejectReason.length })}
                </p>
              </div>
            )}

            {submitError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {submitError}
              </div>
            )}

            {action && (
              <button
                onClick={() => void handleSubmit()}
                disabled={
                  submitting ||
                  (action === 'APPROVE' && !canApprove) ||
                  (action === 'REJECT' && !canReject)
                }
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'APPROVE'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {submitting
                  ? t('submitting')
                  : action === 'APPROVE'
                    ? t('confirmApproval')
                    : t('confirmRejection')}
              </button>
            )}

            {action === 'APPROVE' && !allChecked && (
              <p className="text-xs text-amber-600 text-center mt-2">
                {t('completeChecklist')}
              </p>
            )}
          </section>

          {/* BRD note */}
          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Note:</strong> {t('brdNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
