'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('operations');
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  const ROLE_NAV: Record<string, { label: string; href: (locale: string) => string }[]> = {
    CONTROL_TOWER_OPERATOR: [
      { label: t('navDashboard'), href: (l) => `/${l}/operations/dashboard` },
    ],
    GATE_OFFICER: [
      { label: t('navGate'), href: (l) => `/${l}/operations/gate` },
    ],
    PARKING_CHECKER: [
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
    GATE_OFFICER:           t('roleLabelGateOfficer'),
    PARKING_CHECKER:        t('roleLabelParkingChecker'),
    BORDER_OFFICER:         t('roleLabelBorderOfficer'),
    TERMINAL_OPERATOR:      t('roleLabelTerminalOperator'),
  };

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout', { refreshToken }); } catch {}
    clearAuth();
    router.push(`/${locale}/login`);
  };

  const navLinks = (user?.role ? ROLE_NAV[user.role] : null) ?? [];
  const portalLabel = user?.role ? (ROLE_LABELS[user.role] ?? t('roleLabelOperations')) : t('roleLabelOperations');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <span className="font-bold text-lg">POB Operations</span>
              <span className="ml-2 text-xs text-slate-400">{portalLabel}</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href(locale)}
                  className="hover:text-slate-300 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.email}</span>
            <LocaleSwitcher variant="dark" />
            <button
              onClick={handleLogout}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
