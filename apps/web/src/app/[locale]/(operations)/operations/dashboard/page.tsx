'use client';

import { useAuthStore } from '@/store/auth.store';

export default function ControlTowerDashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Active Queue', value: '—', icon: '🚛', color: 'text-blue-600' },
    { label: 'Trucks in Port', value: '—', icon: '⚓', color: 'text-green-600' },
    { label: 'Pending Gate Entry', value: '—', icon: '🚧', color: 'text-amber-600' },
    { label: 'No-Show Alerts', value: '—', icon: '⚠️', color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Control Tower Dashboard</h1>
        <p className="text-gray-500 mt-1">{user?.email} · Control Tower Operator</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">Queue Management</h2>
        <p className="text-gray-400 text-sm">
          Real-time queue view and control tower operations will be available in the next module (Step 3).
        </p>
      </div>
    </div>
  );
}
