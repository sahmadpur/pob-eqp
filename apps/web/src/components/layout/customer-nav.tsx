'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Crest } from '@/components/brand/crest';

export function CustomerNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  // Block PENDING_REVIEW legal users from accessing customer pages
  useEffect(() => {
    if (user?.accountStatus === 'PENDING_REVIEW' || user?.accountStatus === 'PENDING_EMAIL') {
      router.replace(`/${locale}/register/legal/pending`);
    }
  }, [user?.accountStatus, locale, router]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // swallow
    } finally {
      clearAuth();
      router.push(`/${locale}/login`);
    }
  };

  const links = [
    { href: `/${locale}/customer/dashboard`, label: t('dashboard') },
    { href: `/${locale}/customer/orders`, label: t('orders') },
    { href: `/${locale}/customer/orders/new`, label: t('newOrder') },
    { href: `/${locale}/customer/profile`, label: t('profile') },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <nav className="bg-ink-800 text-parchment-100 border-b border-ink-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={`/${locale}/customer/dashboard`} className="flex items-center gap-2.5 group">
            <span className="text-brass-300 group-hover:text-brass-200 transition-colors">
              <Crest className="w-7 h-7" />
            </span>
            <div className="hidden sm:block">
              <p className="font-display text-base leading-none tracking-tight text-parchment-50">
                Port of Baku
              </p>
              <p className="text-[9px] uppercase tracking-eyebrow text-brass-300 font-medium mt-0.5">
                E-Queue · Customer
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  isActive(link.href)
                    ? 'text-brass-200 bg-white/[0.06]'
                    : 'text-parchment-200/80 hover:text-parchment-50 hover:bg-white/[0.04]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden lg:inline text-xs text-parchment-300/70 font-mono">
            {user?.email ?? user?.phone}
          </span>
          <LocaleSwitcher variant="dark" />
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-eyebrow font-medium bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 rounded-md transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}
