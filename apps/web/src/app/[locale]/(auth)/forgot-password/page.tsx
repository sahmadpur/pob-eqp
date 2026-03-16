'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useLocale } from 'next-intl';
import Link from 'next/link';

const schema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { identifier: data.identifier });
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pob-navy to-pob-blue flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Enter your email or phone number and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-green-800 font-medium">Reset link sent!</p>
              <p className="text-green-600 text-sm mt-1">
                Check your email or SMS for the password reset instructions.
              </p>
            </div>
            <Link
              href={`/${locale}/login`}
              className="block w-full text-center bg-pob-blue text-white py-3 rounded-xl font-semibold hover:bg-pob-blue-light transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone Number
              </label>
              <input
                {...register('identifier')}
                type="text"
                placeholder="e.g. user@example.com or +994501234567"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pob-blue focus:border-transparent"
              />
              {errors.identifier && (
                <p className="text-red-500 text-sm mt-1">{errors.identifier.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-pob-blue text-white py-3 rounded-xl font-semibold hover:bg-pob-blue-light disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </button>

            <Link
              href={`/${locale}/login`}
              className="block w-full text-center text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              ← Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
