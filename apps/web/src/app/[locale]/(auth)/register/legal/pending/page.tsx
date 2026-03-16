'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RegistrationStatus } from '@pob-eqp/shared';

interface Profile {
  registrationStatus: RegistrationStatus;
  companyName: string;
  updatedAt: string;
  reviews: Array<{ action: string; reason: string | null; createdAt: string }>;
}

// P1-10: Legal entity — pending Finance review status tracker
export default function LegalPendingPage() {
  const locale = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get<{ data: { legalProfile: Profile } }>(
          '/registration/me',
        );
        const lp = res.data.data.legalProfile;
        setProfile(lp);

        // Redirect if status changed
        if (lp.registrationStatus === RegistrationStatus.APPROVED) {
          router.push(`/${locale}/dashboard`);
        }
      } catch {
        setError('Failed to load registration status.');
      } finally {
        setLoading(false);
      }
    };

    void fetchStatus();

    // Poll every 30 seconds
    const interval = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(interval);
  }, [locale, router]);

  const STATUS_CONFIG: Record<
    string,
    { icon: string; label: string; color: string; bg: string; border: string }
  > = {
    [RegistrationStatus.SUBMITTED]: {
      icon: '⏳',
      label: 'Under Review',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    [RegistrationStatus.APPROVED]: {
      icon: '✅',
      label: 'Approved',
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    [RegistrationStatus.DECLINED]: {
      icon: '❌',
      label: 'Rejected',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    [RegistrationStatus.SUBMITTED]: {
      icon: '📝',
      label: 'Draft',
      color: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading registration status...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 text-sm mb-3">{error ?? 'No profile found.'}</p>
        <Link href={`/${locale}/login`} className="text-pob-blue hover:underline text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  const status = profile.registrationStatus;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[RegistrationStatus.SUBMITTED];
  const lastReview = profile.reviews?.[0];

  const timelineSteps = [
    {
      label: 'Registration Submitted',
      done: true,
      icon: '📋',
    },
    {
      label: 'OTP Verification',
      done: true,
      icon: '✉️',
    },
    {
      label: 'Documents Uploaded',
      done: true,
      icon: '📁',
    },
    {
      label: 'Finance Review',
      done: [RegistrationStatus.APPROVED, RegistrationStatus.DECLINED].includes(status as RegistrationStatus),
      active: status === RegistrationStatus.SUBMITTED,
      icon: status === RegistrationStatus.APPROVED ? '✅' : status === RegistrationStatus.DECLINED ? '❌' : '⏳',
    },
    {
      label: 'Account Activated',
      done: status === RegistrationStatus.APPROVED,
      icon: '🎉',
    },
  ];

  return (
    <>
      <div className="text-center mb-6">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${cfg.bg} border-2 ${cfg.border}`}
        >
          <span className="text-4xl">{cfg.icon}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">{profile.companyName}</h2>
        <span
          className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Application Progress
        </p>
        <div className="space-y-0">
          {timelineSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    step.done
                      ? 'bg-pob-blue text-white'
                      : step.active
                        ? 'bg-amber-100 border-2 border-amber-400'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.done ? '✓' : step.active ? '⏳' : '○'}
                </div>
                {i < timelineSteps.length - 1 && (
                  <div className={`w-0.5 h-8 ${step.done ? 'bg-pob-blue' : 'bg-gray-200'}`} />
                )}
              </div>
              <div className="pb-4 pt-1">
                <p
                  className={`text-sm font-medium ${
                    step.done ? 'text-gray-800' : step.active ? 'text-amber-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rejection details */}
      {status === RegistrationStatus.DECLINED && lastReview && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-800 mb-1">Review Decision</p>
          {lastReview.reason && (
            <p className="text-sm text-red-700 mb-2">{lastReview.reason}</p>
          )}
          <p className="text-xs text-red-500">
            Reviewed on {new Date(lastReview.createdAt).toLocaleDateString()}
          </p>
          <Link
            href={`/${locale}/register/legal/documents`}
            className="mt-3 inline-block text-sm text-pob-blue hover:underline font-medium"
          >
            Resubmit with corrections →
          </Link>
        </div>
      )}

      {/* Pending message */}
      {status === RegistrationStatus.SUBMITTED && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Estimated time:</strong> 1–2 business days. You will receive an email/SMS
            notification once the Finance Officer completes the review. This page auto-refreshes
            every 30 seconds.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {status === RegistrationStatus.APPROVED && (
          <Link
            href={`/${locale}/dashboard`}
            className="block w-full py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light transition-colors text-center"
          >
            Go to Dashboard →
          </Link>
        )}
        <Link
          href={`/${locale}/login`}
          className="block w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center text-sm"
        >
          Sign In
        </Link>
      </div>
    </>
  );
}
