'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('admin');
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout', { refreshToken }); } catch {}
    clearAuth();
    router.push(`/${locale}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-lg">POB Admin</span>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href={`/${locale}/admin/dashboard`} className="hover:text-gray-300 transition-colors">{t('navDashboard')}</Link>
              <Link href={`/${locale}/admin/users`} className="hover:text-gray-300 transition-colors">{t('navUsers')}</Link>
              <Link href={`/${locale}/admin/planning`} className="hover:text-gray-300 transition-colors">{t('navPlanning')}</Link>
              <Link href={`/${locale}/admin/orders`} className="hover:text-gray-300 transition-colors">{t('navOrders')}</Link>
              <Link href={`/${locale}/admin/registrations`} className="hover:text-gray-300 transition-colors">{t('navRegistrations')}</Link>
              <Link href={`/${locale}/admin/system`} className="hover:text-gray-300 transition-colors">{t('navSystemConfig')}</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <LocaleSwitcher variant="dark" />
            <button onClick={handleLogout} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              {t('logout')}
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
