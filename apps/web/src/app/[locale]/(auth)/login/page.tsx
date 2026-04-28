'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone required'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/auth/login', data);
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth({ accessToken, refreshToken, user });

      // Role-based redirect
      const roleRedirects: Record<string, string> = {
        CUSTOMER_INDIVIDUAL: `/${locale}/customer/dashboard`,
        CUSTOMER_LEGAL: `/${locale}/customer/dashboard`,
        FINANCE_OFFICER: `/${locale}/finance/dashboard`,
        ADMINISTRATOR: `/${locale}/admin/dashboard`,
        CONTROL_TOWER_OPERATOR: `/${locale}/operations/dashboard`,
        GATE_CONTROLLER: `/${locale}/operations/gate`,
        PARKING_CONTROLLER: `/${locale}/operations/parking`,
        BORDER_OFFICER: `/${locale}/operations/border`,
        TERMINAL_OPERATOR: `/${locale}/operations/terminal`,
        SYSTEM_ADMINISTRATOR: `/${locale}/admin/system`,
      };

      router.push(roleRedirects[user.role] ?? `/${locale}/customer/dashboard`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const message =
        axiosErr.response?.data?.message ??
        (err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Editorial header — small eyebrow + serif title */}
      <p className="eyebrow-brass">{t('secureAccess')}</p>
      <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-ink">
        {t('signIn')}
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        {t('secureAccessSubtitle')}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-3 p-3.5 bg-wine-50 border border-wine-100 rounded-lg"
        >
          <svg className="w-4 h-4 mt-0.5 text-wine-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-wine-600 text-sm leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
        {/* Identifier */}
        <div>
          <label htmlFor="identifier" className="eyebrow flex items-center justify-between mb-1.5">
            <span>{t('emailOrPhone')}</span>
          </label>
          <input
            id="identifier"
            {...register('identifier')}
            type="text"
            autoComplete="username"
            suppressHydrationWarning
            className="field"
            placeholder="example@portofbaku.az"
          />
          {errors.identifier && (
            <p className="mt-1.5 text-xs text-wine-600">{errors.identifier.message}</p>
          )}
        </div>

        {/* Password with reveal toggle */}
        <div>
          <label htmlFor="password" className="eyebrow flex items-center justify-between mb-1.5">
            <span>{t('password')}</span>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-[11px] normal-case tracking-normal text-brass-600 hover:text-brass-700 hover:underline font-medium"
            >
              {t('forgotPassword')}
            </Link>
          </label>
          <div className="relative">
            <input
              id="password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              suppressHydrationWarning
              className="field pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-ink-400 hover:text-ink-700 transition-colors"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-wine-600">{errors.password.message}</p>
          )}
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 text-sm text-ink-600 cursor-pointer select-none">
          <input
            {...register('rememberMe')}
            type="checkbox"
            className="w-4 h-4 rounded border-parchment-400 text-brass-500 focus:ring-brass-300"
          />
          <span>{t('rememberMe')}</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-brass w-full py-3 mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-parchment-50/40 border-t-parchment-50 rounded-full animate-spin" />
              <span>{t('signingIn')}</span>
            </>
          ) : (
            <>
              <span>{t('signIn')}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Brass divider */}
      <div className="relative my-7 flex items-center justify-center">
        <span className="admiralty-rule absolute inset-x-0" />
        <span className="relative px-3 bg-white eyebrow text-ink-400">{t('or')}</span>
      </div>

      <p className="text-center text-sm text-ink-600">
        {t('noAccount')}{' '}
        <Link
          href={`/${locale}/register`}
          className="font-medium text-ink-800 hover:text-brass-600 transition-colors underline-offset-4 hover:underline"
        >
          {t('register')}
        </Link>
      </p>
    </>
  );
}
