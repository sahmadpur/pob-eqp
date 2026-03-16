'use client';

import { useAuthStore } from '@/store/auth.store';

export default function TerminalOperatorPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Terminal Operations</h1>
        <p className="text-gray-500 mt-1">{user?.email} · Terminal Operator</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">🏭</div>
          <p className="text-2xl font-bold text-gray-800">—</p>
          <p className="text-xs text-gray-400 mt-1">Active Vessels</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">📦</div>
          <p className="text-2xl font-bold text-blue-600">—</p>
          <p className="text-xs text-gray-400 mt-1">Trucks Loading</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-2xl font-bold text-green-600">—</p>
          <p className="text-xs text-gray-400 mt-1">Loaded Today</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-2">Terminal Manifest</h2>
        <p className="text-gray-400 text-sm">
          Vessel loading management, manifest generation and immutability controls will be available in the shipment module (Step 3).
        </p>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs font-semibold text-amber-700">BRD Rule</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Manifest PDFs are immutable after GENERATED status. Finance Officer override + audit trail required for any changes.
          </p>
        </div>
      </div>
    </div>
  );
}
