'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

const schema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations('forgotPassword');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { identifier: data.identifier });
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('failed'));
    }
  };

  return (
    <>
      <p className="eyebrow-brass">Account Recovery</p>
      <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-ink">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-ink-500 leading-relaxed">{t('subtitle')}</p>

      {sent ? (
        <div className="mt-7 space-y-5">
          <div className="surface-sunken bg-sea-50 border-sea-100 p-5">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-sea-500 text-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-sea-700">{t('sentTitle')}</p>
                <p className="text-sm text-sea-600/80 mt-0.5">{t('sentMessage')}</p>
              </div>
            </div>
          </div>
          <Link href={`/${locale}/login`} className="btn-brass w-full py-3">
            {t('backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
          <div>
            <label htmlFor="identifier" className="eyebrow block mb-1.5">
              {t('emailOrPhone')}
            </label>
            <input
              id="identifier"
              {...register('identifier')}
              type="text"
              placeholder="user@example.com  /  +994501234567"
              className="field"
            />
            {errors.identifier && (
              <p className="mt-1.5 text-xs text-wine-600">{errors.identifier.message}</p>
            )}
          </div>

          {error && (
            <div className="flex gap-2.5 p-3 bg-wine-50 border border-wine-100 rounded-lg">
              <p className="text-wine-600 text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-brass w-full py-3 mt-1">
            {isSubmitting ? t('sending') : t('sendBtn')}
          </button>

          <Link
            href={`/${locale}/login`}
            className="block text-center text-sm text-ink-500 hover:text-ink-800 transition-colors mt-2"
          >
            ← {t('backToLogin')}
          </Link>
        </form>
      )}
    </>
  );
}
