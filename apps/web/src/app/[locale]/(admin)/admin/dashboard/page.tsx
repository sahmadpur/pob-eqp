'use client';

import { useAuthStore } from '@/store/auth.store';
import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const locale = useLocale();

  const tiles = [
    { href: `/${locale}/registrations`, emoji: '📋', label: 'Registrations', desc: 'Review legal entity applications' },
    { href: `/${locale}/admin/users`, emoji: '👥', label: 'Users', desc: 'Manage platform users' },
    { href: `/${locale}/admin/planning`, emoji: '📅', label: 'Planning', desc: 'Manage queue plans' },
    { href: `/${locale}/admin/system`, emoji: '⚙️', label: 'System Config', desc: 'Platform settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">{user?.email} · Administrator</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{tile.emoji}</div>
            <h3 className="font-semibold text-lg text-gray-800">{tile.label}</h3>
            <p className="text-gray-500 text-sm mt-1">{tile.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
