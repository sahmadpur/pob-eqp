'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRegistrationStore } from '@/store/registration.store';

// P1-05: Registration submitted / P1-06: Account activated
export default function RegistrationSuccessPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get('type') ?? 'individual'; // 'individual' | 'legal'
  const { reset, individualDraft, legalDraft } = useRegistrationStore();

  const isIndividual = type === 'individual';

  useEffect(() => {
    // Clear registration state after displaying success
    const timer = setTimeout(() => reset(), 5000);
    return () => clearTimeout(timer);
  }, [reset]);

  return (
    <div className="text-center py-4">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
          isIndividual ? 'bg-green-100' : 'bg-amber-100'
        }`}
      >
        <span className="text-4xl">{isIndividual ? '✅' : '⏳'}</span>
      </div>

      {isIndividual ? (
        <>
          {/* P1-06: Individual account activated immediately */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Activated!</h2>
          <p className="text-gray-500 text-sm mb-1">Welcome to Port of Baku E-Queue Platform</p>
          {individualDraft && (
            <p className="font-semibold text-gray-700 mb-4">
              {individualDraft.firstName} {individualDraft.lastName}
            </p>
          )}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left space-y-2">
            {[
              'Identity documents submitted for verification',
              'Account activated — you can now sign in',
              'You can create shipment orders immediately',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-green-800">
                <span className="text-green-500 flex-shrink-0">✓</span>
                {item}
              </div>
            ))}
          </div>

          <Link
            href={`/${locale}/login`}
            className="block w-full py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            Sign In to Your Account →
          </Link>
        </>
      ) : (
        <>
          {/* P1-05: Legal entity submitted — awaiting Finance review */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 text-sm mb-1">Your registration is under review</p>
          {legalDraft && (
            <p className="font-semibold text-gray-700 mb-4">{legalDraft.companyName}</p>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">📋</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm mb-1">What happens next?</p>
                <ol className="space-y-1.5">
                  {[
                    'Finance Officer reviews your documents (1–2 business days)',
                    'You receive an email/SMS notification with the decision',
                    'If approved, your account is activated immediately',
                    'If rejected, you can resubmit once with corrections',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                      <span className="bg-amber-200 text-amber-800 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href={`/${locale}/login`}
              className="block w-full py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light transition-colors"
            >
              Go to Sign In
            </Link>
            <p className="text-xs text-gray-500 text-center">
              You can track your application status after signing in
            </p>
          </div>
        </>
      )}

      <Link
        href={`/${locale}/landing`}
        className="block mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
