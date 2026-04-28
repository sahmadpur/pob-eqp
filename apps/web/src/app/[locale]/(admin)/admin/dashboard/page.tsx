'use client';

import { useAuthStore } from '@/store/auth.store';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const locale = useLocale();
  const t = useTranslations('admin');

  const tiles = [
    {
      href: `/${locale}/admin/registrations`,
      label: t('registrations'),
      desc: t('registrationsDesc'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      ),
    },
    {
      href: `/${locale}/admin/users`,
      label: t('users'),
      desc: t('usersDesc'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      ),
    },
    {
      href: `/${locale}/admin/planning`,
      label: t('planning'),
      desc: t('planningDesc'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      ),
    },
    {
      href: `/${locale}/admin/system`,
      label: t('systemConfig'),
      desc: t('systemConfigDesc'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="border-b border-parchment-300 pb-5">
        <p className="eyebrow-brass">{t('administrator')}</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight text-ink">
          {t('dashboardTitle')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 font-mono tabular-nums">{user?.email}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group surface p-6 hover:border-brass-400 hover:shadow-admiralty transition-all"
          >
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-parchment-100 text-ink-700 group-hover:bg-brass-100 group-hover:text-brass-700 transition-colors mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                {tile.icon}
              </svg>
            </span>
            <h3 className="font-display text-lg text-ink leading-tight">{tile.label}</h3>
            <p className="mt-1.5 text-sm text-ink-500">{tile.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
