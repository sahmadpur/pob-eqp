'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Crest } from '@/components/brand/crest';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('admin');
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {}
    clearAuth();
    router.push(`/${locale}/login`);
  };

  const links = [
    { href: `/${locale}/admin/dashboard`, label: t('navDashboard') },
    { href: `/${locale}/admin/users`, label: t('navUsers') },
    { href: `/${locale}/admin/planning`, label: t('navPlanning') },
    { href: `/${locale}/admin/orders`, label: t('navOrders') },
    { href: `/${locale}/admin/registrations`, label: t('navRegistrations') },
    { href: `/${locale}/admin/system`, label: t('navSystemConfig') },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div className="min-h-screen bg-parchment">
      <nav className="bg-ink-900 text-parchment-100 border-b border-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href={`/${locale}/admin/dashboard`} className="flex items-center gap-2.5 group shrink-0">
            <span className="text-brass-300 group-hover:text-brass-200 transition-colors">
              <Crest className="w-7 h-7" />
            </span>
            <div className="hidden sm:block">
              <p className="font-display text-base leading-none tracking-tight text-parchment-50">
                Port of Baku
              </p>
              <p className="text-[9px] uppercase tracking-eyebrow text-brass-300 font-medium mt-0.5">
                Administrator
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-0.5 text-sm flex-1 justify-center overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  isActive(link.href)
                    ? 'text-brass-200 bg-white/[0.06]'
                    : 'text-parchment-200/80 hover:text-parchment-50 hover:bg-white/[0.04]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden lg:inline text-xs text-parchment-300/70 font-mono truncate max-w-[200px]">
              {user?.email}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</main>
    </div>
  );
}
