'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function SystemAdminDashboardPage() {
  const locale = useLocale();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
        <p className="text-gray-500 mt-1">Platform configuration and system settings</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500">System administration tools will appear here.</p>
        <Link href={`/${locale}/admin/dashboard`} className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
