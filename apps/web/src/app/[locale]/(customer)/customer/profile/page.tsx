'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

interface ProfileData {
  id: string;
  email: string;
  phone: string;
  role: string;
  accountStatus: string;
  locale: string;
  lastLoginAt?: string;
  createdAt: string;
  individualProfile?: {
    firstName: string;
    lastName: string;
    fathersName?: string;
    dateOfBirth?: string;
    nationalIdOrPassport?: string;
  };
  legalProfile?: {
    companyName: string;
    taxRegistrationId: string;
    contactPersonName: string;
    contactPersonPosition?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:              'bg-green-100 text-green-700',
  PENDING_EMAIL:       'bg-yellow-100 text-yellow-700',
  PENDING_DOCUMENTS:   'bg-yellow-100 text-yellow-700',
  UNDER_REVIEW:        'bg-blue-100 text-blue-700',
  SUSPENDED:           'bg-red-100 text-red-700',
  REJECTED:            'bg-red-100 text-red-700',
};

export default function CustomerProfilePage() {
  const { user } = useAuthStore();
  const t = useTranslations('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: ProfileData }>('/registration/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => setError(t('failedToLoad')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>;
  }

  const p = profile;
  const name = p?.individualProfile
    ? `${p.individualProfile.firstName} ${p.individualProfile.lastName}`
    : p?.legalProfile?.companyName ?? user?.email ?? '—';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Avatar + name */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-pob-blue flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
          <p className="text-gray-500 text-sm">{p?.email}</p>
          <div className="flex gap-2 mt-1.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p?.accountStatus ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
              {p?.accountStatus?.replace(/_/g, ' ')}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {p?.role?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">{t('contactInfo')}</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">{t('email')}</dt>
            <dd className="text-gray-800 font-medium">{p?.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">{t('phone')}</dt>
            <dd className="text-gray-800 font-medium">{p?.phone ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">{t('preferredLanguage')}</dt>
            <dd className="text-gray-800 font-medium uppercase">{p?.locale ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Individual profile */}
      {p?.individualProfile && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t('personalDetails')}</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('fullName')}</dt>
              <dd className="text-gray-800 font-medium">
                {p.individualProfile.firstName} {p.individualProfile.fathersName ? `${p.individualProfile.fathersName} ` : ''}{p.individualProfile.lastName}
              </dd>
            </div>
            {p.individualProfile.dateOfBirth && (
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('dateOfBirth')}</dt>
                <dd className="text-gray-800 font-medium">
                  {new Date(p.individualProfile.dateOfBirth).toLocaleDateString()}
                </dd>
              </div>
            )}
            {p.individualProfile.nationalIdOrPassport && (
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('idPassport')}</dt>
                <dd className="text-gray-800 font-medium font-mono">{p.individualProfile.nationalIdOrPassport}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Legal profile */}
      {p?.legalProfile && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t('companyDetails')}</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('companyName')}</dt>
              <dd className="text-gray-800 font-medium">{p.legalProfile.companyName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('taxId')}</dt>
              <dd className="text-gray-800 font-medium font-mono">{p.legalProfile.taxRegistrationId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('contactPerson')}</dt>
              <dd className="text-gray-800 font-medium">{p.legalProfile.contactPersonName}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Account meta */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">{t('accountActivity')}</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">{t('memberSince')}</dt>
            <dd className="text-gray-800 font-medium">
              {p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">{t('lastLogin')}</dt>
            <dd className="text-gray-800 font-medium">
              {p?.lastLoginAt ? new Date(p.lastLoginAt).toLocaleString() : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
