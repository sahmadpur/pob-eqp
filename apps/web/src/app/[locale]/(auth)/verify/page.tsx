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
      <div className="flex items-center justify-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full ${step <= 3 ? 'w-8 bg-pob-blue' : 'w-4 bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">{tReg('step3of4')}</span>
      </div>

      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📱</span>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-1">{t('title')}</h2>
      <p className="text-gray-500 text-sm mb-1">
        {t('sentCode')}
      </p>
      <p className="font-semibold text-gray-700 mb-5">{maskedIdentifier}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* OTP input boxes */}
      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-0 transition-colors ${
              digit
                ? 'border-pob-blue bg-blue-50 text-pob-blue'
                : 'border-gray-300 text-gray-800'
            } ${error ? 'border-red-400' : ''}`}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      <button
        onClick={() => void handleVerify()}
        disabled={loading || otp.some((d) => !d)}
        className="w-full py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
      >
        {loading ? t('verifying') : t('verifyBtn')}
      </button>

      {/* Resend */}
      <p className="text-sm text-gray-500">
        {t('didNotReceive')}{' '}
        {resendCooldown > 0 ? (
          <span className="text-gray-400">{t('resendIn', { seconds: resendCooldown })}</span>
        ) : (
          <button
            onClick={() => void handleResend()}
            disabled={resending}
            className="text-pob-blue hover:underline font-medium disabled:opacity-50"
          >
            {resending ? t('sending') : t('resend')}
          </button>
        )}
      </p>

      <p className="text-xs text-gray-400 mt-4">
        {t('codeExpires', { minutes: AUTH_CONSTANTS.OTP_EXPIRY_MINUTES })}
      </p>
    </div>
  );
}
