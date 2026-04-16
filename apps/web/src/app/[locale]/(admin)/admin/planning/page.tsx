'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface WeatherDay {
  date: string;
  windSpeedMs: number;
  precipitationMm: number;
  waveHeightM: number;
  isHighRisk: boolean;
  isWarning: boolean;
  available: boolean;
  reasons: string[];
}

function WeatherPreview({ startDate, endDate }: { startDate: string; endDate: string }) {
  const t = useTranslations('planning');
  const [days, setDays] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
      setDays([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNoKey(false);
    apiClient
      .get<{ data: WeatherDay[] }>('/planning/weather-preview', { params: { startDate, endDate } })
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        setDays(data);
        // If all days are unavailable and none have forecast data, probably no API key
        if (data.length > 0 && data.every((d) => !d.available)) setNoKey(true);
      })
      .catch(() => { if (!cancelled) setNoKey(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  if (!startDate || !endDate) return null;

  const highRisk = days.filter((d) => d.isHighRisk);
  const warnings = days.filter((d) => d.isWarning);
  const noData   = days.filter((d) => !d.available);
  const clear    = days.filter((d) => d.available && !d.isHighRisk && !d.isWarning);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          🌤 {t('weatherCheck')}
          <span className="text-gray-400 font-normal">{t('weatherForecast')}</span>
        </span>
        {loading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
      </div>

      {noKey ? (
        <div className="px-4 py-3 text-xs text-amber-700 bg-amber-50">
          ⚠ {t('weatherUnavailable')}
        </div>
      ) : loading ? (
        <div className="px-4 py-3 text-xs text-gray-400">{t('weatherFetching')}</div>
      ) : days.length === 0 ? null : (
        <>
          {/* Summary bar */}
          <div className="px-4 py-2.5 flex flex-wrap gap-3 text-xs border-b border-gray-100">
            <span className="flex items-center gap-1 font-medium text-gray-600">
              {days.length === 1
                ? t('weatherDaysChecked', { count: days.length })
                : t('weatherDaysCheckedPlural', { count: days.length })}
            </span>
            {highRisk.length > 0 && (
              <span className="flex items-center gap-1 font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                🔴 {t('weatherHighRisk', { count: highRisk.length })}
              </span>
            )}
            {warnings.length > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                🟡 {t('weatherWarning', { count: warnings.length })}
              </span>
            )}
            {clear.length > 0 && (
              <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                🟢 {t('weatherClear', { count: clear.length })}
              </span>
            )}
            {noData.length > 0 && (
              <span className="text-gray-400">
                {t('weatherBeyondWindow', { count: noData.length })}
              </span>
            )}
          </div>

          {/* Problem days */}
          {(highRisk.length > 0 || warnings.length > 0) && (
            <div className="divide-y divide-gray-100">
              {[...highRisk, ...warnings].map((d) => (
                <div key={d.date} className={`px-4 py-2 flex items-start gap-3 text-xs ${d.isHighRisk ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <span className={`mt-0.5 shrink-0 font-bold ${d.isHighRisk ? 'text-red-500' : 'text-amber-500'}`}>
                    {d.isHighRisk ? '⛔' : '⚠️'}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`ml-2 font-medium ${d.isHighRisk ? 'text-red-600' : 'text-amber-600'}`}>
                      {d.isHighRisk ? t('weatherHighRiskLabel') : t('weatherCautionLabel')}
                    </span>
                    <div className="text-gray-500 mt-0.5">{d.reasons.join(' · ')}</div>
                  </div>
                  <div className="ml-auto flex gap-3 shrink-0 text-gray-500">
                    {d.windSpeedMs > 0 && <span>💨 {d.windSpeedMs} m/s</span>}
                    {d.precipitationMm > 0 && <span>🌧 {d.precipitationMm} mm</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {highRisk.length === 0 && warnings.length === 0 && clear.length > 0 && (
            <div className="px-4 py-2.5 text-xs text-green-700 bg-green-50">
              ✅ {t('weatherNoAdverse')}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface QueueTypeRow {
  _key: string;
  name: string;
  baseType: string | null;
  quotaSharePercent: string;
  loadingSequence: number;
}

interface Plan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  defaultDailyQuota: number;
  status: string;
  createdAt: string;
  queueTypes?: Array<{ id: string; name: string; baseType: string | null; quotaSharePercent: number; loadingSequence: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-yellow-100 text-yellow-700',
  ACTIVE:   'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
  COMPLETED:'bg-blue-100 text-blue-700',
};

// Human-readable labels for standard base types
const QUEUE_LABEL: Record<string, string> = {
  PRIORITY:   'Priority',
  FAST_TRACK: 'Fast Track',
  REGULAR:    'Regular',
};
const fmtQueue = (name: string) =>
  QUEUE_LABEL[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const DEFAULT_QUEUE_TYPES: QueueTypeRow[] = [
  { _key: 'priority',   name: 'Priority',   baseType: 'PRIORITY',   quotaSharePercent: '10', loadingSequence: 1 },
  { _key: 'fast_track', name: 'Fast Track', baseType: 'FAST_TRACK', quotaSharePercent: '10', loadingSequence: 2 },
  { _key: 'regular',    name: 'Regular',    baseType: 'REGULAR',    quotaSharePercent: '80', loadingSequence: 3 },
];

type FormMode = 'create' | 'edit';

function QueueTypeEditor({
  queueTypes,
  setQueueTypes,
}: {
  queueTypes: QueueTypeRow[];
  setQueueTypes: React.Dispatch<React.SetStateAction<QueueTypeRow[]>>;
}) {
  const t = useTranslations('planning');
  const percentTotal = queueTypes.reduce((s, qt) => s + (parseFloat(qt.quotaSharePercent) || 0), 0);
  const valid = Math.abs(percentTotal - 100) < 0.01;

  const add = () =>
    setQueueTypes((p) => [
      ...p,
      { _key: `custom-${Date.now()}`, name: '', baseType: null, quotaSharePercent: '0', loadingSequence: p.length + 1 },
    ]);

  const remove = (key: string) =>
    setQueueTypes((p) => p.filter((q) => q._key !== key).map((q, i) => ({ ...q, loadingSequence: i + 1 })));

  const move = (key: string, dir: 'up' | 'down') =>
    setQueueTypes((p) => {
      const idx = p.findIndex((q) => q._key === key);
      if (dir === 'up' && idx === 0) return p;
      if (dir === 'down' && idx === p.length - 1) return p;
      const next = [...p];
      const si = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[si]] = [next[si], next[idx]];
      return next.map((q, i) => ({ ...q, loadingSequence: i + 1 }));
    });

  const update = (key: string, field: keyof Omit<QueueTypeRow, '_key'>, value: string | number | null) =>
    setQueueTypes((p) => p.map((q) => (q._key === key ? { ...q, [field]: value } : q)));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{t('queueTypes')}</label>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {t('queueTotal', { percent: percentTotal.toFixed(1) })} {valid ? '✓' : t('mustBe100')}
        </span>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">{t('orderCol')}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">{t('nameCol')}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">{t('baseTypeCol')}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">{t('shareCol')}</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {queueTypes.map((qt, idx) => (
              <tr key={qt._key}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                      {qt.loadingSequence}
                    </span>
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(qt._key, 'up')} disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed leading-none text-xs" title={t('moveUp')}>▲</button>
                      <button type="button" onClick={() => move(qt._key, 'down')} disabled={idx === queueTypes.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed leading-none text-xs" title={t('moveDown')}>▼</button>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={qt.name} placeholder={t('queueNamePlaceholder')}
                    onChange={(e) => update(qt._key, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-2">
                  <select value={qt.baseType ?? ''}
                    onChange={(e) => update(qt._key, 'baseType', e.target.value || null)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">{t('customType')}</option>
                    <option value="PRIORITY">Priority</option>
                    <option value="FAST_TRACK">Fast Track</option>
                    <option value="REGULAR">Regular</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} max={100} step={0.1} value={qt.quotaSharePercent}
                      onChange={(e) => update(qt._key, 'quotaSharePercent', e.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => remove(qt._key)} disabled={queueTypes.length <= 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none" title={t('removeQueue')}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
        {t('addCustomQueue')}
      </button>
    </div>
  );
}

export default function PlanningPage() {
  const t = useTranslations('planning');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', defaultDailyQuota: '1000' });
  const [queueTypes, setQueueTypes] = useState<QueueTypeRow[]>(DEFAULT_QUEUE_TYPES);
  const [formError, setFormError] = useState('');

  const percentTotal = queueTypes.reduce((s, qt) => s + (parseFloat(qt.quotaSharePercent) || 0), 0);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<{ data: Plan[] }>('/planning/plans');
      setPlans(data.data);
    } catch {
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchPlans(); }, []);

  const openCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setForm({ name: '', startDate: '', endDate: '', defaultDailyQuota: '1000' });
    setQueueTypes(DEFAULT_QUEUE_TYPES);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (plan: Plan) => {
    setFormMode('edit');
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      startDate: plan.startDate.split('T')[0],
      endDate: plan.endDate.split('T')[0],
      defaultDailyQuota: String(plan.defaultDailyQuota),
    });
    setQueueTypes(
      plan.queueTypes && plan.queueTypes.length > 0
        ? plan.queueTypes
            .sort((a, b) => a.loadingSequence - b.loadingSequence)
            .map((qt) => ({
              _key: qt.id,
              name: fmtQueue(qt.name),
              baseType: qt.baseType,
              quotaSharePercent: String(Number(qt.quotaSharePercent)),
              loadingSequence: qt.loadingSequence,
            }))
        : DEFAULT_QUEUE_TYPES,
    );
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setFormError(''); };

  const validateForm = () => {
    if (!form.name || !form.startDate || !form.endDate) return t('validationName');
    if (new Date(form.startDate) > new Date(form.endDate)) return t('validationDates');
    if (queueTypes.length === 0) return t('validationQueueRequired');
    if (queueTypes.some((qt) => !qt.name.trim())) return t('validationQueueName');
    if (Math.abs(percentTotal - 100) > 0.01) return t('validationQueuePercent', { current: percentTotal.toFixed(1) });
    return null;
  };

  const buildQueuePayload = () =>
    queueTypes.map((qt) => ({
      name: qt.name.trim().toUpperCase().replace(/\s+/g, '_'),
      baseType: qt.baseType,
      quotaSharePercent: parseFloat(qt.quotaSharePercent),
      loadingSequence: qt.loadingSequence,
    }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSubmitting(true);
    try {
      const { data } = await apiClient.post<{ data: Plan }>('/planning/plans', {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        defaultDailyQuota: parseInt(form.defaultDailyQuota, 10),
        queueTypes: buildQueuePayload(),
      });
      closeForm();
      setSuccessMsg(t('planCreated', { name: data.data.name }));
      await fetchPlans();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? t('failedToCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSubmitting(true);
    try {
      await apiClient.patch(`/planning/plans/${editingId}`, {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        defaultDailyQuota: parseInt(form.defaultDailyQuota, 10),
        queueTypes: buildQueuePayload(),
      });
      closeForm();
      setSuccessMsg(t('planUpdated'));
      await fetchPlans();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? t('failedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (planId: string) => {
    if (!confirm(t('confirmActivate'))) return;
    setActivating(planId);
    try {
      await apiClient.patch(`/planning/plans/${planId}/activate`);
      setSuccessMsg(t('planActivated'));
      await fetchPlans();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('failedToActivate'));
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(t('confirmDelete', { name: plan.name }))) return;
    setDeleting(plan.id);
    try {
      await apiClient.delete(`/planning/plans/${plan.id}`);
      setSuccessMsg(t('planDeleted', { name: plan.name }));
      await fetchPlans();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('failedToDelete'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        {!showForm && (
          <button onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            {t('newPlanBtn')}
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {formMode === 'create' ? t('createNewPlan') : t('editPlan', { name: form.name || '…' })}
            </h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
          </div>
          <form onSubmit={formMode === 'create' ? handleCreate : handleEdit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('planName')}</label>
                <input type="text" value={form.name} placeholder="e.g. Q2 2026 Operations"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('endDate')}</label>
                <input type="date" value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('defaultDailyQuota')} <span className="text-gray-400 font-normal">({t('trucksPerDay')})</span>
                </label>
                <input type="number" min={1} max={9999} value={form.defaultDailyQuota}
                  onChange={(e) => setForm((f) => ({ ...f, defaultDailyQuota: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Weather preview — auto-fetches when both dates are set */}
            {form.startDate && form.endDate && (
              <WeatherPreview startDate={form.startDate} endDate={form.endDate} />
            )}

            <QueueTypeEditor queueTypes={queueTypes} setQueueTypes={setQueueTypes} />

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                {t('cancel')}
              </button>
              <button type="submit" disabled={submitting || Math.abs(percentTotal - 100) > 0.01}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting
                  ? (formMode === 'create' ? t('creating') : t('saving'))
                  : (formMode === 'create' ? t('createBtn') : t('saveBtn'))}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 ml-4 font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-green-600 hover:text-green-800 ml-4 font-bold">✕</button>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          {t('loading')}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-semibold text-gray-700">{t('noPlansTitle')}</h3>
          <p className="text-gray-400 text-sm mt-1">{t('noPlansDesc')}</p>
          <button onClick={openCreate}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            {t('createFirstPlan')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id}
              className={`bg-white rounded-xl border-2 p-5 transition-all ${plan.status === 'ACTIVE' ? 'border-green-300' : plan.status === 'DRAFT' ? 'border-yellow-300' : 'border-gray-200 opacity-70'}`}>
              <div className="flex items-start justify-between gap-4">
                {/* Left: name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900 text-base truncate">{plan.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[plan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {new Date(plan.startDate).toLocaleDateString()} – {new Date(plan.endDate).toLocaleDateString()}
                    <span className="mx-2 text-gray-300">|</span>
                    {plan.defaultDailyQuota} {t('trucksPerDay')}
                  </p>
                  {plan.queueTypes && plan.queueTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {plan.queueTypes
                        .sort((a, b) => a.loadingSequence - b.loadingSequence)
                        .map((qt) => (
                          <span key={qt.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            <span className="font-semibold">{qt.loadingSequence}.</span>
                            {fmtQueue(qt.name)}
                            <span className="text-blue-400">— {Number(qt.quotaSharePercent)}%</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {plan.status === 'DRAFT' && (
                    <button onClick={() => handleActivate(plan.id)} disabled={activating === plan.id}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {activating === plan.id ? t('activating') : t('activateBtn')}
                    </button>
                  )}
                  {plan.status !== 'ARCHIVED' && (
                    <button onClick={() => openEdit(plan)}
                      className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                      {t('editBtn')}
                    </button>
                  )}
                  {plan.status === 'DRAFT' && (
                    <button onClick={() => handleDelete(plan)} disabled={deleting === plan.id}
                      className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                      {deleting === plan.id ? t('deleting') : t('deleteBtn')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
