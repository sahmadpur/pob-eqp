'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import QrScannerModal from '@/components/QrScannerModal';
import OrderSummaryCard, { type OrderSummary } from '@/components/operations/OrderSummaryCard';
import SearchableSlotSelect, { type SlotOption } from '@/components/operations/SearchableSlotSelect';

type View = 'idle' | 'assign' | 'success';

interface Zone {
  id: string;
  name: string;
  type: string;
}

interface OccupancyRow {
  zoneId: string;
  zoneName: string;
  total: number;
  occupied: number;
  available: number;
}

export default function ParkingControllerPage() {
  const t = useTranslations('operations');
  const { user } = useAuthStore();

  const [view, setView] = useState<View>('idle');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [assignedLabel, setAssignedLabel] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOccupancy = async () => {
    try {
      const { data } = await apiClient.get<{ data: OccupancyRow[] } | OccupancyRow[]>('/parking/occupancy');
      const rows = (data as { data?: OccupancyRow[] }).data ?? (data as OccupancyRow[]);
      setOccupancy(rows);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiClient.get<{ data: Zone[] } | Zone[]>('/parking/zones');
        const list = (data as { data?: Zone[] }).data ?? (data as Zone[]);
        setZones(list.map((z) => ({ id: z.id, name: z.name, type: z.type })));
      } catch {
        setError(t('parkingErrorZonesLoad'));
      }
      void loadOccupancy();
    })();
  }, []);

  useEffect(() => {
    if (!selectedZoneId) {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlotId(null);
    apiClient
      .get<{ data: SlotOption[] } | SlotOption[]>(
        `/parking/zones/${selectedZoneId}/slots?status=AVAILABLE`,
      )
      .then(({ data }) => {
        const list = (data as { data?: SlotOption[] }).data ?? (data as SlotOption[]);
        setAvailableSlots(list);
      })
      .catch(() => setError(t('parkingErrorSlotsLoad')))
      .finally(() => setLoadingSlots(false));
  }, [selectedZoneId]);

  const reset = () => {
    setView('idle');
    setOrder(null);
    setSelectedZoneId('');
    setAvailableSlots([]);
    setSelectedSlotId(null);
    setAssignedLabel(null);
    setError(null);
    void loadOccupancy();
  };

  const handleScan = async (orderId: string) => {
    setScannerOpen(false);
    setError(null);
    try {
      const { data } = await apiClient.get<{ data: OrderSummary } | OrderSummary>(`/orders/${orderId}`);
      const fetched = (data as { data?: OrderSummary }).data ?? (data as OrderSummary);
      if (fetched.parkingBayId) {
        setError(t('parkingErrorAlreadyParked'));
        return;
      }
      if (fetched.status !== 'IN_SHIPMENT') {
        setError(t('parkingErrorNotInShipment', { status: fetched.status }));
        return;
      }
      setOrder(fetched);
      setView('assign');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('parkingErrorOrderLookup'));
    }
  };

  const handleAssign = async () => {
    if (!order || !selectedZoneId || !selectedSlotId) return;
    const slotLabel = availableSlots.find((s) => s.id === selectedSlotId)?.slotLabel ?? '';
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/parking/assign', {
        orderId: order.orderId,
        zoneId: selectedZoneId,
        slotId: selectedSlotId,
      });
      setAssignedLabel(slotLabel);
      setView('success');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('parkingErrorAssignGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('parkingTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('roleLabelParkingController')}</p>
      </div>

      {occupancy.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {occupancy.map((row) => (
            <div key={row.zoneId} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">{row.zoneName}</p>
              <p className="text-xl font-bold text-gray-900">
                {row.occupied}<span className="text-gray-400 text-sm font-normal">/{row.total}</span>
              </p>
              <p className="text-xs text-emerald-600 mt-1">{row.available} {t('parkingAvailable')}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {view === 'idle' && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-4">
          <div className="text-5xl">🅿️</div>
          <h2 className="font-semibold text-gray-800">{t('parkingScanInstructions')}</h2>
          <button
            onClick={() => setScannerOpen(true)}
            className="bg-pob-blue text-white font-medium px-6 py-3 rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            {t('parkingScanQr')}
          </button>
        </div>
      )}

      {view === 'assign' && order && (
        <div className="space-y-4">
          <OrderSummaryCard order={order} showDocuments={false} />

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">{t('parkingAssignTitle')}</h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('parkingZoneLabel')}
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
              >
                <option value="">{t('parkingZonePlaceholder')}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('parkingSlotLabel')}
              </label>
              <SearchableSlotSelect
                slots={availableSlots}
                value={selectedSlotId}
                onChange={setSelectedSlotId}
                placeholder={loadingSlots ? t('loading') : t('parkingSlotSearchPlaceholder')}
                disabled={!selectedZoneId || loadingSlots}
              />
              {selectedZoneId && !loadingSlots && availableSlots.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">{t('parkingNoAvailableSlots')}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAssign}
              disabled={submitting || !selectedSlotId}
              className="flex-1 bg-pob-blue text-white font-semibold py-3 rounded-lg hover:bg-pob-blue-light disabled:opacity-50 transition-colors"
            >
              {t('parkingBtnAssign')}
            </button>
            <button
              onClick={reset}
              disabled={submitting}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {view === 'success' && order && assignedLabel && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-3">
          <div className="text-5xl">🅿️</div>
          <h2 className="font-bold text-emerald-800 text-lg">{t('parkingSuccessAssigned')}</h2>
          <p className="text-emerald-700 text-sm">
            {t('parkingSlotLabel')}: <span className="font-mono font-semibold">{assignedLabel}</span>
          </p>
          <p className="text-emerald-600 text-xs font-mono">{order.orderId}</p>
          <button
            onClick={reset}
            className="mt-2 bg-pob-blue text-white font-medium px-6 py-2.5 rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            {t('parkingNextTruck')}
          </button>
        </div>
      )}

      {scannerOpen && (
        <QrScannerModal onClose={() => setScannerOpen(false)} onScan={handleScan} />
      )}
    </div>
  );
}
