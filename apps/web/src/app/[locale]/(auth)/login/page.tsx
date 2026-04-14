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
        GATE_OFFICER: `/${locale}/operations/gate`,
        PARKING_CHECKER: `/${locale}/operations/parking`,
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
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">{t('signIn')}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('emailOrPhone')}
          </label>
          <input
            {...register('identifier')}
            type="text"
            autoComplete="username"
            suppressHydrationWarning
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue focus:border-transparent"
            placeholder="example@email.com"
          />
          {errors.identifier && (
            <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('password')}
          </label>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            suppressHydrationWarning
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue focus:border-transparent"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input {...register('rememberMe')} type="checkbox" className="rounded" />
            {t('rememberMe')}
          </label>
          <Link
            href={`/${locale}/forgot-password`}
            className="text-sm text-pob-blue hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('signingIn') : t('signIn')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t('noAccount')}{' '}
        <Link href={`/${locale}/register`} className="text-pob-blue hover:underline font-medium">
          {t('register')}
        </Link>
      </p>
    </>
  );
}
