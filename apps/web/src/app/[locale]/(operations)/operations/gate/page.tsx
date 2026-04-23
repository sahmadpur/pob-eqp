'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import QrScannerModal from '@/components/QrScannerModal';
import OrderSummaryCard, { type OrderSummary } from '@/components/operations/OrderSummaryCard';

type View = 'idle' | 'review' | 'clarify' | 'success-pass' | 'success-clarify';

const DEFAULT_CHECKS = ['documentsOk', 'driverIdOk', 'vehicleOk'] as const;
type CheckKey = typeof DEFAULT_CHECKS[number];

export default function GateControllerPage() {
  const t = useTranslations('operations');
  const { user } = useAuthStore();

  const [view, setView] = useState<View>('idle');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    documentsOk: true,
    driverIdOk: true,
    vehicleOk: true,
  });
  const [clarifyNote, setClarifyNote] = useState('');
  const [gatePassNumber, setGatePassNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setView('idle');
    setOrder(null);
    setChecks({ documentsOk: true, driverIdOk: true, vehicleOk: true });
    setClarifyNote('');
    setGatePassNumber(null);
    setError(null);
  };

  const handleScan = async (orderId: string) => {
    setScannerOpen(false);
    setError(null);
    try {
      const { data } = await apiClient.get<{ data: OrderSummary } | OrderSummary>(`/orders/${orderId}`);
      const fetched = (data as { data?: OrderSummary }).data ?? (data as OrderSummary);
      if (fetched.status !== 'VERIFIED') {
        setError(t('gateErrorNotVerified', { status: fetched.status }));
        return;
      }
      setOrder(fetched);
      setView('review');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('gateErrorNotFound'));
    }
  };

  const handlePass = async () => {
    if (!order) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post<{ data?: { gatePassNumber: string } } | { gatePassNumber: string }>(
        '/shipment/gate-checkin',
        {
          orderId: order.orderId,
          method: 'QR_SCAN',
          checksResult: checks,
          vehiclePlate: order.vehiclePlateNumber ?? undefined,
        },
      );
      const payload = (data as { data?: { gatePassNumber: string } }).data ?? (data as { gatePassNumber: string });
      setGatePassNumber(payload.gatePassNumber);
      setView('success-pass');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('gateErrorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClarifySubmit = async () => {
    if (!order || !clarifyNote.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/shipment/gate-clarify', {
        orderId: order.orderId,
        requestNote: clarifyNote.trim(),
      });
      setView('success-clarify');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('gateErrorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('gateTitle')}</h1>
        <p className="text-gray-500 mt-1">{user?.email} · {t('roleLabelGateController')}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {view === 'idle' && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-4">
          <div className="text-5xl">🚛</div>
          <h2 className="font-semibold text-gray-800">{t('gateScanInstructions')}</h2>
          <button
            onClick={() => setScannerOpen(true)}
            className="bg-pob-blue text-white font-medium px-6 py-3 rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            {t('gateScanQr')}
          </button>
        </div>
      )}

      {view === 'review' && order && (
        <div className="space-y-4">
          <OrderSummaryCard order={order} />

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3">{t('gateDocChecklist')}</h3>
            <div className="space-y-2">
              {DEFAULT_CHECKS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-pob-blue focus:ring-pob-blue"
                  />
                  <span>{t(`gateCheck_${key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePass}
              disabled={submitting}
              className="flex-1 bg-emerald-600 text-white font-semibold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              ✓ {t('gateBtnPass')}
            </button>
            <button
              onClick={() => setView('clarify')}
              disabled={submitting}
              className="flex-1 bg-amber-600 text-white font-semibold py-3 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              ⚠ {t('gateBtnClarify')}
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

      {view === 'clarify' && order && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">{t('gateClarifyTitle')}</h3>
          <p className="text-sm text-gray-500">{t('gateClarifyDesc')}</p>
          <textarea
            value={clarifyNote}
            onChange={(e) => setClarifyNote(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder={t('gateClarifyNotePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue resize-none"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{clarifyNote.length} / 500</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClarifySubmit}
              disabled={submitting || !clarifyNote.trim()}
              className="flex-1 bg-amber-600 text-white font-semibold py-3 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {t('gateClarifySend')}
            </button>
            <button
              onClick={() => { setView('review'); setError(null); }}
              disabled={submitting}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('back')}
            </button>
          </div>
        </div>
      )}

      {view === 'success-pass' && order && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-3">
          <div className="text-5xl">✅</div>
          <h2 className="font-bold text-emerald-800 text-lg">{t('gateSuccessPass')}</h2>
          <p className="text-emerald-700 text-sm">
            {t('gatePassNumber')}: <span className="font-mono font-semibold">{gatePassNumber}</span>
          </p>
          <p className="text-emerald-600 text-xs font-mono">{order.orderId}</p>
          <button
            onClick={reset}
            className="mt-2 bg-pob-blue text-white font-medium px-6 py-2.5 rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            {t('nextTruck')}
          </button>
        </div>
      )}

      {view === 'success-clarify' && order && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-3">
          <div className="text-5xl">📨</div>
          <h2 className="font-bold text-amber-800 text-lg">{t('gateSuccessClarify')}</h2>
          <p className="text-amber-700 text-sm">{t('gateSuccessClarifyDesc')}</p>
          <p className="text-amber-600 text-xs font-mono">{order.orderId}</p>
          <button
            onClick={reset}
            className="mt-2 bg-pob-blue text-white font-medium px-6 py-2.5 rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            {t('nextTruck')}
          </button>
        </div>
      )}

      {scannerOpen && (
        <QrScannerModal onClose={() => setScannerOpen(false)} onScan={handleScan} />
      )}
    </div>
  );
}
