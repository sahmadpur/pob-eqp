'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RegistrationStore, useRegistrationStore } from '@/store/registration.store';

const schema = z
  .object({
    firstName: z.string().min(2, 'Min 2 characters').max(100),
    lastName: z.string().min(2, 'Min 2 characters').max(100),
    fathersName: z.string().max(100).optional(),
    dateOfBirth: z.string().refine((v) => {
      const dob = new Date(v);
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18 && age <= 100;
    }, 'Must be 18 or older'),
    nationalIdOrPassport: z
      .string()
      .min(6, 'Min 6 characters')
      .max(30)
      .regex(/^[A-Z0-9]+$/i, 'Only letters and digits'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, 'E.164 format required e.g. +994501234567')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
    preferredLanguage: z.enum(['AZ', 'EN', 'RU', 'TR']).default('EN'),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Either email or phone is required',
    path: ['email'],
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

// P1-02: Individual customer registration — personal details
export default function IndividualRegisterPage() {
  const locale = useLocale();
  const router = useRouter();
  const { setIndividualDraft, setUserId, setIdentifier } = useRegistrationStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ data: { id: string; email?: string; phone?: string } }>(
        '/registration/individual',
        {
          firstName: data.firstName,
          lastName: data.lastName,
          fathersName: data.fathersName || undefined,
          dateOfBirth: data.dateOfBirth,
          nationalIdOrPassport: data.nationalIdOrPassport.toUpperCase(),
          email: data.email || undefined,
          phone: data.phone || undefined,
          password: data.password,
          preferredLanguage: data.preferredLanguage,
        },
      );

      const { id, email, phone } = res.data.data;
      setUserId(id);
      setIdentifier(email ?? phone ?? '');
      setIndividualDraft({ ...data });

      // Navigate to OTP verification
      const identifierParam = encodeURIComponent(email ?? phone ?? '');
      router.push(`/${locale}/verify?identifier=${identifierParam}&type=individual`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const password = watch('password');

  const passwordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (!pwd) return { label: '', color: 'bg-gray-200', width: 'w-0' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (pwd.length >= 12) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
    if (score === 3) return { label: 'Fair', color: 'bg-amber-400', width: 'w-2/4' };
    if (score === 4) return { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' };
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };

  const strength = passwordStrength(password ?? '');

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full ${step <= 2 ? 'w-8 bg-pob-blue' : 'w-4 bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">Step 2 of 4</span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <Link href={`/${locale}/register`} className="text-gray-400 hover:text-gray-600">
          ←
        </Link>
        <h2 className="text-xl font-bold text-gray-800">Personal Details</h2>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Individual customer · All fields marked * are required
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
            <input
              {...register('firstName')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
              placeholder="Ali"
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              {...register('lastName')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
              placeholder="Mammadov"
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Father&apos;s Name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            {...register('fathersName')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
            placeholder="Huseyn"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              {...register('dateOfBirth')}
              type="date"
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
            />
            {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">National ID / Passport *</label>
            <input
              {...register('nationalIdOrPassport')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue uppercase"
              placeholder="AZE1234567"
            />
            {errors.nationalIdOrPassport && (
              <p className="mt-1 text-xs text-red-600">{errors.nationalIdOrPassport.message}</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Contact & Login
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400">(required if no phone)</span>
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
                placeholder="ali@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400">(E.164 format)</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
                placeholder="+994501234567"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
            />
            {password && (
              <div className="mt-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all`} />
                  </div>
                  <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 chars, uppercase, number, special character
                </p>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pob-blue"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Language</label>
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
          className="w-full py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
        >
          {loading ? 'Creating account...' : 'Continue →'}
        </button>
      </form>
    </>
  );
}
