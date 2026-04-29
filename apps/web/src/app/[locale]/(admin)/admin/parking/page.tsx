'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface AdminZone {
  id: string;
  name: string;
  type: 'REGULAR' | 'FAST_TRACK' | 'HAZARDOUS_PRIORITY' | 'OVERSIZED';
  capacity: number;
  description: string | null;
  isActive: boolean;
  slotPrefix: string;
  slotCount: number;
  occupied: number;
  reserved: number;
  available: number;
}

const ZONE_TYPES: AdminZone['type'][] = ['REGULAR', 'FAST_TRACK', 'HAZARDOUS_PRIORITY', 'OVERSIZED'];

const TYPE_BADGE: Record<AdminZone['type'], string> = {
  REGULAR: 'bg-blue-50 text-blue-700 border-blue-200',
  FAST_TRACK: 'bg-amber-50 text-amber-700 border-amber-200',
  HAZARDOUS_PRIORITY: 'bg-red-50 text-red-700 border-red-200',
  OVERSIZED: 'bg-purple-50 text-purple-700 border-purple-200',
};

type FormMode = 'create' | 'edit';

interface FormState {
  name: string;
  type: AdminZone['type'];
  capacity: string;
  slotPrefix: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'REGULAR',
  capacity: '50',
  slotPrefix: '',
  description: '',
  isActive: true,
};

export default function AdminParkingPage() {
  const t = useTranslations('adminParking');
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalCapacity, setOriginalCapacity] = useState<number>(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<{ data: AdminZone[] } | AdminZone[]>('/parking/admin/zones');
      const list = (data as { data?: AdminZone[] }).data ?? (data as AdminZone[]);
      setZones(list);
    } catch {
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchZones(); }, []);

  const openCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setOriginalCapacity(0);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (zone: AdminZone) => {
    setFormMode('edit');
    setEditingId(zone.id);
    setOriginalCapacity(zone.capacity);
    setForm({
      name: zone.name,
      type: zone.type,
      capacity: String(zone.capacity),
      slotPrefix: zone.slotPrefix,
      description: zone.description ?? '',
      isActive: zone.isActive,
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError('');
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return t('validationName');
    const cap = parseInt(form.capacity, 10);
    if (!Number.isFinite(cap) || cap < 1 || cap > 9999) return t('validationCapacity');
    if (formMode === 'create') {
      if (!form.slotPrefix.trim()) return t('validationPrefixRequired');
      if (!/^[A-Za-z0-9]{1,4}$/.test(form.slotPrefix.trim())) return t('validationPrefixFormat');
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await apiClient.post('/parking/admin/zones', {
          name: form.name.trim(),
          type: form.type,
          capacity: parseInt(form.capacity, 10),
          slotPrefix: form.slotPrefix.trim().toUpperCase(),
          description: form.description.trim() || undefined,
        });
        setSuccessMsg(t('zoneCreated', { name: form.name.trim() }));
      } else if (editingId) {
        await apiClient.patch(`/parking/admin/zones/${editingId}`, {
          name: form.name.trim(),
          type: form.type,
          capacity: parseInt(form.capacity, 10),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });
        setSuccessMsg(t('zoneUpdated'));
      }
      closeForm();
      await fetchZones();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? (formMode === 'create' ? t('failedToCreate') : t('failedToUpdate')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (zone: AdminZone) => {
    if (!confirm(t('confirmDelete', { name: zone.name }))) return;
    setDeleting(zone.id);
    try {
      await apiClient.delete(`/parking/admin/zones/${zone.id}`);
      setSuccessMsg(t('zoneDeleted', { name: zone.name }));
      await fetchZones();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('failedToDelete'));
    } finally {
      setDeleting(null);
    }
  };

  const proposedCapacity = parseInt(form.capacity, 10);
  const capacityDelta =
    formMode === 'edit' && Number.isFinite(proposedCapacity)
      ? proposedCapacity - originalCapacity
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t('newZoneBtn')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {formMode === 'create' ? t('createNewZone') : t('editZone', { name: form.name || '…' })}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('zoneName')}</label>
                <input
                  type="text"
                  value={form.name}
                  placeholder={t('zoneNamePlaceholder')}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('zoneType')}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AdminZone['type'] }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ZONE_TYPES.map((tp) => (
                    <option key={tp} value={tp}>{t(`type_${tp}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('capacity')}</label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formMode === 'edit' && capacityDelta !== 0 && (
                  <p className={`text-xs mt-1 ${capacityDelta > 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {capacityDelta > 0
                      ? t('capacityWillAdd', { count: capacityDelta })
                      : t('capacityWillRemove', { count: -capacityDelta })}
                  </p>
                )}
              </div>

              {formMode === 'create' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('slotPrefix')}</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={form.slotPrefix}
                    placeholder="E"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slotPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('slotPrefixHelp', { prefix: form.slotPrefix || 'E' })}</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('slotPrefix')}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600">
                    {form.slotPrefix || '—'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t('slotPrefixLocked')}</p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
                <textarea
                  rows={2}
                  value={form.description}
                  placeholder={t('descriptionPlaceholder')}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {formMode === 'edit' && (
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    id="zone-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="zone-active" className="text-sm text-gray-700">
                    {t('isActiveLabel')}
                  </label>
                </div>
              )}
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? formMode === 'create' ? t('creating') : t('saving')
                  : formMode === 'create' ? t('createBtn') : t('saveBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

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

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          {t('loading')}
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🅿️</div>
          <h3 className="text-lg font-semibold text-gray-700">{t('noZonesTitle')}</h3>
          <p className="text-gray-400 text-sm mt-1">{t('noZonesDesc')}</p>
          <button
            onClick={openCreate}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t('createFirstZone')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => {
            const utilization = zone.slotCount > 0 ? Math.round((zone.occupied / zone.slotCount) * 100) : 0;
            return (
              <div
                key={zone.id}
                className={`bg-white rounded-xl border-2 p-5 transition-all ${zone.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 text-base truncate">{zone.name}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[zone.type]}`}>
                        {t(`type_${zone.type}`)}
                      </span>
                      {!zone.isActive && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {t('inactive')}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">{zone.slotPrefix}-***</span>
                    </div>
                    {zone.description && (
                      <p className="text-gray-500 text-xs mt-1">{zone.description}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 max-w-xl">
                      <Stat label={t('capacity')} value={zone.capacity} />
                      <Stat label={t('available')} value={zone.available} tone="emerald" />
                      <Stat label={t('occupied')} value={zone.occupied} tone="red" />
                      <Stat label={t('utilization')} value={`${utilization}%`} />
                    </div>
                    {zone.slotCount !== zone.capacity && (
                      <p className="text-xs text-amber-600 mt-2">
                        ⚠ {t('slotMismatch', { slots: zone.slotCount, capacity: zone.capacity })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(zone)}
                      className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      {t('editBtn')}
                    </button>
                    <button
                      onClick={() => handleDelete(zone)}
                      disabled={deleting === zone.id || zone.occupied > 0 || zone.reserved > 0}
                      title={zone.occupied > 0 || zone.reserved > 0 ? t('cannotDeleteInUse') : ''}
                      className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {deleting === zone.id ? t('deleting') : t('deleteBtn')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'emerald' | 'red' }) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-gray-800';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
