'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Plan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  defaultDailyQuota: number;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export default function PlanningPage() {
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    defaultDailyQuota: '50',
  });
  const [formError, setFormError] = useState('');

  const fetchActivePlan = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<{ data: Plan }>('/planning/plans/active');
      setActivePlan(data.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setActivePlan(null); // No active plan yet
      } else {
        setError('Failed to load active plan');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchActivePlan(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.startDate || !form.endDate) {
      setFormError('Name, start date, and end date are required.');
      return;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      setFormError('End date must be after start date.');
      return;
    }
    setCreating(true);
    try {
      const { data } = await apiClient.post<{ data: Plan }>('/planning/plans', {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        defaultDailyQuota: parseInt(form.defaultDailyQuota, 10),
      });
      setShowForm(false);
      setForm({ name: '', startDate: '', endDate: '', defaultDailyQuota: '50' });
      // Refresh active plan (new plan is DRAFT, might not be active yet)
      await fetchActivePlan();
      alert(`Plan "${data.data.name}" created as DRAFT. Activate it to make it live.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (planId: string) => {
    if (!confirm('Activate this plan? The current active plan will be archived.')) return;
    setActivating(planId);
    try {
      await apiClient.patch(`/planning/plans/${planId}/activate`);
      await fetchActivePlan();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to activate plan');
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
          <p className="text-gray-500 mt-1">Manage operational queue plans</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ New Plan'}
        </button>
      </div>

      {/* Create Plan Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New Plan</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Q2 2026 Operations"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Daily Quota <span className="text-gray-400 font-normal">(trucks/day)</span>
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={form.defaultDailyQuota}
                onChange={(e) => setForm((f) => ({ ...f, defaultDailyQuota: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formError && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Plan */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : activePlan ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{activePlan.name}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[activePlan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {activePlan.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm">ID: {activePlan.id}</p>
            </div>
            {activePlan.status === 'DRAFT' && (
              <button
                onClick={() => handleActivate(activePlan.id)}
                disabled={activating === activePlan.id}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {activating === activePlan.id ? 'Activating…' : '▶ Activate'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Start Date</p>
              <p className="font-semibold text-gray-800">{new Date(activePlan.startDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">End Date</p>
              <p className="font-semibold text-gray-800">{new Date(activePlan.endDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Daily Quota</p>
              <p className="font-semibold text-gray-800">{activePlan.defaultDailyQuota} trucks/day</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Created</p>
              <p className="font-semibold text-gray-800">{new Date(activePlan.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 mb-1">BRD Queue Split</p>
            <div className="flex gap-4 text-sm text-blue-800">
              <span>🔴 Priority — <strong>10%</strong></span>
              <span>🟡 Fast-Track — <strong>10%</strong></span>
              <span>🟢 Regular — <strong>80%</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-semibold text-gray-700">No Active Plan</h3>
          <p className="text-gray-400 text-sm mt-1">Create and activate an operational plan to enable queue management.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Create First Plan
          </button>
        </div>
      )}
    </div>
  );
}
