'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Crest } from '@/components/brand/crest';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('operations');
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  const ROLE_NAV: Record<string, { label: string; href: (locale: string) => string }[]> = {
    CONTROL_TOWER_OPERATOR: [
      { label: t('navDashboard'), href: (l) => `/${l}/operations/dashboard` },
    ],
    GATE_CONTROLLER: [
      { label: t('navGate'), href: (l) => `/${l}/operations/gate` },
    ],
    PARKING_CONTROLLER: [
      { label: t('navParking'), href: (l) => `/${l}/operations/parking` },
    ],
    BORDER_OFFICER: [
      { label: t('navBorder'), href: (l) => `/${l}/operations/border` },
    ],
    TERMINAL_OPERATOR: [
      { label: t('navTerminal'), href: (l) => `/${l}/operations/terminal` },
    ],
  };

  const ROLE_LABELS: Record<string, string> = {
    CONTROL_TOWER_OPERATOR: t('roleLabelControlTower'),
    GATE_CONTROLLER: t('roleLabelGateController'),
    PARKING_CONTROLLER: t('roleLabelParkingController'),
    BORDER_OFFICER: t('roleLabelBorderOfficer'),
    TERMINAL_OPERATOR: t('roleLabelTerminalOperator'),
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {}
    clearAuth();
    router.push(`/${locale}/login`);
  };

  const navLinks = (user?.role ? ROLE_NAV[user.role] : null) ?? [];
  const portalLabel = user?.role
    ? ROLE_LABELS[user.role] ?? t('roleLabelOperations')
    : t('roleLabelOperations');

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div className="min-h-screen bg-parchment">
      <nav className="bg-ink-700 text-parchment-100 border-b border-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-brass-300">
              <Crest className="w-7 h-7" />
            </span>
            <div className="hidden sm:block">
              <p className="font-display text-base leading-none tracking-tight text-parchment-50">
                Port of Baku
              </p>
              <p className="text-[9px] uppercase tracking-eyebrow text-brass-300 font-medium mt-0.5">
                Operations · {portalLabel}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href(locale)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  isActive(link.href(locale))
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
