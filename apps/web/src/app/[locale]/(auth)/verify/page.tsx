'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { useRegistrationStore } from '@/store/registration.store';
import { useAuthStore } from '@/store/auth.store';
import { AUTH_CONSTANTS } from '@pob-eqp/shared';
import type { UserSummary } from '@pob-eqp/shared';

// P1-03: OTP verification (email or phone) after registration
export default function VerifyOtpPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('verify');
  const tReg = useTranslations('register');
  const params = useSearchParams();

  const identifier = params.get('identifier') ?? '';
  const type = params.get('type') ?? 'individual'; // 'individual' | 'legal'

  const { setOtpVerified } = useRegistrationStore();
  const { setAuth } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError(t('enterCode'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{
        data: {
          valid: boolean;
          accessToken?: string;
          refreshToken?: string;
          user?: UserSummary;
        };
      }>('/auth/verify-otp', {
        identifier: decodeURIComponent(identifier),
        code,
      });

      setOtpVerified(true);

      // API wraps all responses as { success, data: { ... } }
      const payload = res.data.data;
      if (payload?.accessToken && payload?.refreshToken && payload?.user) {
        setAuth({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          user: payload.user,
        });
      }

      // Route based on registration type
      if (type === 'individual') {
        router.push(`/${locale}/register/individual/documents`);
      } else {
        router.push(`/${locale}/register/legal/documents`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? t('invalidOtp'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otp, identifier, type, locale, router, setOtpVerified]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.every((d) => d !== '')) {
      void handleVerify();
    }
  }, [otp, handleVerify]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await apiClient.post('/auth/forgot-password', {
        identifier: decodeURIComponent(identifier),
      });
      setResendCooldown(60);
    } catch {
      setError(t('resendFailed'));
    } finally {
      setResending(false);
    }
  };

  const maskedIdentifier = (() => {
    const id = decodeURIComponent(identifier);
    if (id.includes('@')) {
      const [user, domain] = id.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    }
    return `${id.slice(0, 4)}***${id.slice(-3)}`;
  })();

  return (
    <div className="text-center">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-7">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1 rounded-full transition-all ${
                step <= 3 ? 'w-9 bg-brass-500' : 'w-4 bg-parchment-300'
              }`}
            />
          ))}
        </div>
        <span className="ml-2 eyebrow text-ink-400">{tReg('step3of4')}</span>
      </div>

      <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-parchment-100 border border-parchment-300 flex items-center justify-center text-brass-600">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <p className="eyebrow-brass">Verification</p>
      <h2 className="mt-2 font-display text-2xl leading-[1.15] tracking-tight text-ink">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-ink-500">{t('sentCode')}</p>
      <p className="mt-1 font-mono text-sm text-ink tabular-nums">{maskedIdentifier}</p>

      {error && (
        <div className="mt-5 p-3 bg-wine-50 border border-wine-100 text-wine-600 rounded-lg text-sm text-left">
          {error}
        </div>
      )}

      {/* OTP input boxes — admiralty cell style */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-7 mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-mono font-medium tabular-nums border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-brass-200 focus:border-brass-500 transition-colors
              ${digit ? 'border-brass-400 bg-brass-50 text-ink' : 'border-parchment-300 bg-white text-ink'}
              ${error ? 'border-wine-300 bg-wine-50' : ''}`}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      <button
        onClick={() => void handleVerify()}
        disabled={loading || otp.some((d) => !d)}
        className="btn-brass w-full py-3 mb-5"
      >
        {loading ? t('verifying') : t('verifyBtn')}
      </button>

      {/* Resend */}
      <p className="text-sm text-ink-500">
        {t('didNotReceive')}{' '}
        {resendCooldown > 0 ? (
          <span className="text-ink-400 tabular-nums">{t('resendIn', { seconds: resendCooldown })}</span>
        ) : (
          <button
            onClick={() => void handleResend()}
            disabled={resending}
            className="font-medium text-brass-600 hover:text-brass-700 hover:underline disabled:opacity-50"
          >
            {resending ? t('sending') : t('resend')}
          </button>
        )}
      </p>

      <p className="text-xs text-ink-400 mt-3 tabular-nums">
        {t('codeExpires', { minutes: AUTH_CONSTANTS.OTP_EXPIRY_MINUTES })}
      </p>
    </div>
  );
}
