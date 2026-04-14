'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useRegistrationStore } from '@/store/registration.store';

const schema = z
  .object({
    companyName: z.string().min(2, 'Min 2 characters').max(200),
    taxRegistrationId: z.string().min(5, 'Min 5 characters').max(30),
    contactPersonName: z.string().min(2, 'Min 2 characters').max(200),
    contactPersonPhone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, 'E.164 format required')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, 'E.164 format required')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    confirmPassword: z.string(),
    preferredLanguage: z.enum(['AZ', 'EN', 'RU', 'TR']).default('EN'),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Either company email or phone is required',
    path: ['email'],
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

// P1-07: Legal entity registration — company information
export default function LegalRegisterPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('registerLegal');
  const tReg = useTranslations('register');
  const { setUserId, setIdentifier, setLegalDraft } = useRegistrationStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ data: { id: string; email?: string; phone?: string } }>(
        '/registration/legal',
        {
          companyName: data.companyName,
          taxRegistrationId: data.taxRegistrationId,
          contactPersonName: data.contactPersonName,
          contactPersonPhone: data.contactPersonPhone || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          password: data.password,
          preferredLanguage: data.preferredLanguage,
        },
      );

      const { id, email, phone } = res.data.data;
      setUserId(id);
      setIdentifier(email ?? phone ?? '');
      setLegalDraft({ ...data, email: data.email || undefined, phone: data.phone || undefined, contactPersonPhone: data.contactPersonPhone || undefined });

      const identifierParam = encodeURIComponent(email ?? phone ?? '');
      router.push(`/${locale}/verify?identifier=${identifierParam}&type=legal`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full ${step <= 2 ? 'w-8 bg-pob-blue' : 'w-4 bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">{tReg('step2of5')}</span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <Link href={`/${locale}/register`} className="text-gray-400 hover:text-gray-600">←</Link>
        <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
      </div>
      <p className="text-gray-500 text-sm mb-5">{t('subtitle')}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('companyName')} *</label>
          <input
            {...register('companyName')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
            placeholder="ABC Logistics LLC"
          />
          {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('taxId')} *
          </label>
          <input
            {...register('taxRegistrationId')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
            placeholder="1234567890"
          />
          {errors.taxRegistrationId && (
            <p className="mt-1 text-xs text-red-600">{errors.taxRegistrationId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('contactPersonName')} *
            </label>
            <input
              {...register('contactPersonName')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
              placeholder="Kamran Aliyev"
            />
            {errors.contactPersonName && (
              <p className="mt-1 text-xs text-red-600">{errors.contactPersonName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('contactPhone')}
            </label>
            <input
              {...register('contactPersonPhone')}
              type="tel"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
              placeholder="+994501234567"
            />
            {errors.contactPersonPhone && (
              <p className="mt-1 text-xs text-red-600">{errors.contactPersonPhone.message}</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            {t('loginCredentials')}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('companyEmail')} <span className="text-gray-400">({t('companyEmailHint')})</span>
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
                placeholder="info@company.az"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('companyPhone')}
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
                placeholder="+994121234567"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('password')} *</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                suppressHydrationWarning
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('confirmPassword')} *
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
                suppressHydrationWarning
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('preferredLanguage')}</label>
          <select
            {...register('preferredLanguage')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
          >
            <option value="AZ">Azərbaycan</option>
            <option value="EN">English</option>
            <option value="RU">Русский</option>
            <option value="TR">Türkçe</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('creatingAccount') : t('continueBtn')}
        </button>
      </form>
    </>
  );
}
