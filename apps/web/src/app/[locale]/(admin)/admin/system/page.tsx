'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface ConfigEntry {
  key: string;
  value: string;
  editing: boolean;
  draft: string;
  saving: boolean;
}

const CONFIG_DESCRIPTIONS: Record<string, { label: string; description: string; unit?: string }> = {
  QUEUE_PRIORITY_PCT: { label: 'Priority Queue %', description: 'Percentage of slots reserved for Priority queue (BRD: 10)', unit: '%' },
  QUEUE_FAST_TRACK_PCT: { label: 'Fast-Track Queue %', description: 'Percentage of slots reserved for Fast-Track queue (BRD: 10)', unit: '%' },
  QUEUE_REGULAR_PCT: { label: 'Regular Queue %', description: 'Percentage of slots for Regular queue (BRD: 80)', unit: '%' },
  NO_SHOW_FINE_AMOUNT: { label: 'No-Show Fine', description: 'Fine amount issued for no-show events (BRD: 50 AZN)', unit: 'AZN' },
  NO_SHOW_TIMER_MINUTES: { label: 'No-Show Timer', description: 'Minutes before a no-show fine is triggered (BRD: 30)', unit: 'min' },
  SLOT_RESERVATION_MINUTES: { label: 'Slot Reservation Timer', description: 'Minutes to hold a slot while order is being placed (BRD: 15)', unit: 'min' },
  MAX_LEGAL_REVIEW_CYCLES: { label: 'Max Review Cycles', description: 'Maximum Finance review cycles for legal entity registration (BRD: 2)' },
};

export default function SystemConfigPage() {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<{ data: Record<string, string> }>('/admin/config');
      const raw = data.data;
      setEntries(
        Object.entries(raw).map(([key, value]) => ({
          key,
          value,
          editing: false,
          draft: value,
          saving: false,
        })),
      );
    } catch {
      setError('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchConfig(); }, []);

  const startEdit = (key: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, editing: true, draft: e.value } : e)),
    );
  };

  const cancelEdit = (key: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, editing: false } : e)));
  };

  const saveEdit = async (key: string) => {
    const entry = entries.find((e) => e.key === key);
    if (!entry) return;
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, saving: true } : e)));
    try {
      await apiClient.patch(`/admin/config/${key}`, { value: entry.draft });
      setEntries((prev) =>
        prev.map((e) =>
          e.key === key ? { ...e, value: entry.draft, editing: false, saving: false } : e,
        ),
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to save');
      setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, saving: false } : e)));
    }
  };

  const updateDraft = (key: string, draft: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, draft } : e)));
  };

  // Validate queue percentages sum to 100
  const queueTotal = ['QUEUE_PRIORITY_PCT', 'QUEUE_FAST_TRACK_PCT', 'QUEUE_REGULAR_PCT'].reduce(
    (sum, key) => {
      const e = entries.find((x) => x.key === key);
      return sum + (e ? parseInt(e.value, 10) || 0 : 0);
    },
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-500 mt-1">Live platform settings — changes take effect immediately</p>
        </div>
        <button
          onClick={fetchConfig}
          className="text-sm bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* BRD queue validation warning */}
      {queueTotal !== 0 && queueTotal !== 100 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Queue Split Violation</p>
            <p className="text-amber-700 text-sm">
              Priority + Fast-Track + Regular must sum to 100%. Currently: {queueTotal}%.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading configuration…
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <h3 className="text-lg font-semibold text-gray-700">No Configuration Found</h3>
          <p className="text-gray-400 text-sm mt-2">
            Run the seed script to populate default values:
          </p>
          <code className="block mt-3 bg-gray-100 rounded-lg p-3 text-sm text-gray-700 text-left">
            docker compose exec -w /app/apps/api api npm run db:seed
          </code>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {entries.map((entry) => {
            const meta = CONFIG_DESCRIPTIONS[entry.key];
            return (
              <div key={entry.key} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">
                    {meta?.label ?? entry.key}
                  </p>
                  {meta?.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
                  )}
                  <p className="text-xs text-gray-300 font-mono mt-0.5">{entry.key}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.editing ? (
                    <>
                      <input
                        type="text"
                        value={entry.draft}
                        onChange={(e) => updateDraft(entry.key, e.target.value)}
                        className="border border-blue-400 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveEdit(entry.key);
                          if (e.key === 'Escape') cancelEdit(entry.key);
                        }}
                      />
                      {meta?.unit && <span className="text-sm text-gray-500">{meta.unit}</span>}
                      <button
                        onClick={() => void saveEdit(entry.key)}
                        disabled={entry.saving}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {entry.saving ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => cancelEdit(entry.key)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg min-w-[3.5rem] text-center">
                        {entry.value}{meta?.unit ? ` ${meta.unit}` : ''}
                      </span>
                      <button
                        onClick={() => startEdit(entry.key)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5 transition-colors"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
