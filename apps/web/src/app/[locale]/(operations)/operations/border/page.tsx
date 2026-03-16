'use client';

import { useAuthStore } from '@/store/auth.store';

export default function BorderOfficerPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Border Control</h1>
        <p className="text-gray-500 mt-1">{user?.email} · Border Officer</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🛂</div>
          <p className="text-2xl font-bold text-gray-800">—</p>
          <p className="text-xs text-gray-400 mt-1">Pending Clearance</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-2xl font-bold text-green-600">—</p>
          <p className="text-xs text-gray-400 mt-1">Cleared Today</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🚫</div>
          <p className="text-2xl font-bold text-red-600">—</p>
          <p className="text-xs text-gray-400 mt-1">Holds / Flags</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">Document Verification</h2>
        <p className="text-gray-400 text-sm">
          Manifest review, customs clearance, and border crossing records will be available in the shipment module (Step 3).
        </p>
      </div>
    </div>
  );
}
