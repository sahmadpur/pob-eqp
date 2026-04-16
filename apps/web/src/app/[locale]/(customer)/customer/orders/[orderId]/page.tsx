'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Document {
  id: string;
  type: string;
  originalFileName: string;
  s3Key: string;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amountAzn: number;
  cashReferenceCode: string | null;
  confirmedAt: string | null;
}

interface TimelineEvent {
  id: string;
  actor: string;
  event: string;
  note: string | null;
  createdAt: string;
}

interface ClarificationRound {
  id: string;
  roundNumber: number;
  requestNote: string;
  requestedAt: string;
  customerNote: string | null;
  customerDocIds: string[];
  respondedAt: string | null;
}

interface OrderDetail {
  id: string;
  orderId: string;
  status: string;
  qrCodeS3Key: string | null;
  queueType: string | null;
  departureDate: string | null;
  destination: string;
  driverFullName: string;
  driverNationalId: string;
  driverPhone: string;
  driverLicense: string | null;
  transportType: string;
  vehiclePlateNumber: string | null;
  vehicleMakeModel: string | null;
  cargoType: string | null;
  cargoWeightTonnes: number | null;
  cargoDescription: string | null;
  paymentMethod: string;
  baseFeeAzn: number;
  cargoFeeAzn: number;
  queueSurchargeAzn: number;
  totalAmountAzn: number;
  createdAt: string;
  documents: Document[];
  payments: Payment[];
  timeline: TimelineEvent[];
  clarificationRounds: ClarificationRound[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  AWAITING_VERIFICATION: 'bg-blue-100 text-blue-700',
  AWAITING_CLARIFICATION: 'bg-orange-100 text-orange-700',
  VERIFIED: 'bg-purple-100 text-purple-700',
  IN_SHIPMENT: 'bg-cyan-100 text-cyan-700',
  BORDER_PASSED: 'bg-teal-100 text-teal-700',
  AT_TERMINAL: 'bg-indigo-100 text-indigo-700',
  LOADED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

export default function CustomerOrderDetailPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const t = useTranslations('orderDetail');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);

  const [clarifyNote, setClarifyNote] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadOrder = () => {
    apiClient
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => setError(t('failedToLoad')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrder(); }, [orderId]);

  useEffect(() => {
    if (!order) return;
    let url: string;
    apiClient
      .get<Blob>(`/orders/${order.orderId}/qr`, { responseType: 'blob' })
      .then((res) => {
        url = URL.createObjectURL(res.data);
        setQrBlobUrl(url);
      })
      .catch(() => { /* QR unavailable — section stays hidden */ });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [order?.orderId]);

  const handleRespond = async () => {
    if (!order || !clarifyNote.trim()) return;
    setSubmitting(true);
    setActionMsg(null);
    try {
      await apiClient.post(`/orders/${order.orderId}/clarify/respond`, {
        customerNote: clarifyNote.trim(),
        customerDocIds: selectedDocIds,
      });
      setActionMsg({ type: 'success', text: t('clarifySuccess') });
      setClarifyNote('');
      setSelectedDocIds([]);
      loadOrder();
    } catch {
      setActionMsg({ type: 'error', text: t('clarifyFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-red-600 text-sm">{error ?? t('notFound')}</p>
    </div>
  );

  const openRound = order.clarificationRounds.find((r) => !r.respondedAt) ?? null;
  const payment = order.payments[0] ?? null;

  const row = (label: string, value: string | null | undefined) => value ? (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/${locale}/customer/orders`)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t('backBtn')}
        </button>
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderId}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {actionMsg && (
        <div className={`p-3 rounded-xl text-sm ${actionMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Clarification Alert */}
      {order.status === 'AWAITING_CLARIFICATION' && openRound && (
        <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
          <div>
            <p className="font-semibold text-orange-800">{t('clarifyAlertTitle')}</p>
            <p className="text-sm text-orange-700 mt-1">{t('clarifyAlertDesc')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">{t('clarifyRequest')}</p>
            <p className="text-sm text-gray-800 bg-white border border-orange-100 rounded-lg px-3 py-2">
              {openRound.requestNote}
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-orange-100">
            <p className="font-medium text-sm text-gray-700">{t('clarifyResponseSection')}</p>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">{t('clarifyNoteLabel')}</label>
              <textarea
                value={clarifyNote}
                onChange={(e) => setClarifyNote(e.target.value)}
                rows={3}
                placeholder={t('clarifyNotePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {order.documents.length > 0 && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">{t('clarifyDocsLabel')}</label>
                <div className="space-y-1">
                  {order.documents.map((doc) => (
                    <label key={doc.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
                      <span className="text-xs text-gray-500 uppercase">{doc.type.replace(/_/g, ' ')}</span>
                      <span>{doc.originalFileName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleRespond}
              disabled={submitting || !clarifyNote.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? t('clarifySubmitting') : t('clarifySubmitBtn')}
            </button>
          </div>
        </div>
      )}

      {/* QR Code */}
      {qrBlobUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <img
              src={qrBlobUrl}
              alt={`QR code for order ${order.orderId}`}
              width={160}
              height={160}
              className="rounded-lg border border-gray-100"
            />
          </div>
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <p className="font-semibold text-gray-800 text-sm">Order QR Code</p>
            <p className="text-xs text-gray-500">
              Scan this code at any checkpoint to pull up your order. Present it at the gate, border, and terminal.
            </p>
            <p className="text-xs font-mono text-gray-400 mt-1">{order.orderId}</p>
            <a
              href={qrBlobUrl}
              download={`${order.orderId}-qr.png`}
              className="inline-block mt-3 px-3 py-1.5 text-xs font-medium bg-pob-blue text-white rounded-lg hover:bg-pob-blue-light transition-colors"
            >
              Download QR
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('driverSection')}</h2>
          {row(t('driverName'), order.driverFullName)}
          {row(t('driverNationalId'), order.driverNationalId)}
          {row(t('driverPhone'), order.driverPhone)}
          {row(t('driverLicense'), order.driverLicense)}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('vehicleSection')}</h2>
          {row(t('plate'), order.vehiclePlateNumber)}
          {row(t('vehicleType'), order.transportType.replace(/_/g, ' '))}
          {row(t('makeModel'), order.vehicleMakeModel)}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('transferSection')}</h2>
          {row(t('destination'), order.destination)}
          {row(t('departureDate'), order.departureDate ? new Date(order.departureDate).toLocaleDateString() : null)}
          {row(t('arrivalDate'), order.departureDate
            ? (d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).toLocaleString())(new Date(order.departureDate))
            : null)}
        </div>

        {(order.cargoType || order.cargoWeightTonnes || order.cargoDescription) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('cargoSection')}</h2>
            {row(t('cargoType'), order.cargoType?.replace(/_/g, ' ') ?? null)}
            {row(t('cargoWeight'), order.cargoWeightTonnes ? `${order.cargoWeightTonnes} tonnes` : null)}
            {row(t('cargoDesc'), order.cargoDescription)}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('feesSection')}</h2>
          {row(t('baseFee'), `${Number(order.baseFeeAzn).toFixed(2)} AZN`)}
          {row(t('queueSurcharge'), `${Number(order.queueSurchargeAzn).toFixed(2)} AZN`)}
          {row(t('cargoFee'), `${Number(order.cargoFeeAzn).toFixed(2)} AZN`)}
          <div className="flex gap-2 text-sm border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-500 w-40 shrink-0 font-semibold">{t('total')}</span>
            <span className="text-gray-900 font-bold">{Number(order.totalAmountAzn).toFixed(2)} AZN</span>
          </div>
        </div>

        {payment && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('paymentSection')}</h2>
            {row(t('paymentMethod'), payment.method.replace(/_/g, ' '))}
            {row(t('paymentStatus'), payment.status.replace(/_/g, ' '))}
            {payment.cashReferenceCode && row(t('cashRef'), payment.cashReferenceCode)}
          </div>
        )}
      </div>

      {order.documents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Uploaded Documents</h2>
          <div className="divide-y divide-gray-100">
            {order.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{doc.type.replace(/_/g, ' ')}</span>
                  <p className="text-gray-800">{doc.originalFileName}</p>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001'}/api/v1/files/${doc.s3Key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">{t('timelineSection')}</h2>
          <ol className="space-y-3">
            {order.timeline.map((ev) => (
              <li key={ev.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-pob-blue mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{ev.event.replace(/_/g, ' ')}</p>
                  {ev.note && <p className="text-gray-500 text-xs">{ev.note}</p>}
                  <p className="text-gray-400 text-xs">{new Date(ev.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
