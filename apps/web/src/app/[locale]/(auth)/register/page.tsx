'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

// P1-01: Account type selection
export default function RegisterChoicePage() {
  const locale = useLocale();

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
        <span className="text-xs text-gray-400 ml-1">Step 1 of 4</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-1">Create Account</h2>
      <p className="text-gray-500 text-sm mb-6">
        Select your account type to continue registration.
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
            <p className="font-semibold text-gray-800">Individual Customer</p>
            <p className="text-sm text-gray-500 mt-0.5">
              For individual drivers and independent carriers — activated immediately
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
              <p className="font-semibold text-gray-800">Legal Entity</p>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                Finance review required
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              For companies and commercial enterprises — 1–2 business days
            </p>
          </div>
          <span className="text-gray-400 group-hover:text-pob-blue mt-1">›</span>
        </Link>
      </div>

      <div className="mt-5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Note:</strong> Legal entity accounts require Finance Officer document review before
          activation. Individual accounts are activated upon OTP verification.
        </p>
      </div>

      <p className="mt-5 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href={`/${locale}/login`} className="text-pob-blue hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}
