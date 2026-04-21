'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Payment {
  id: string;
  method: string;
  status: string;
  amountAzn: number;
  cashReferenceCode: string | null;
  confirmedAt: string | null;
  failureReason: string | null;
}

interface ClarificationRound {
  id: string;
  roundNumber: number;
  requestNote: string;
  requestedAt: string;
  customerNote: string | null;
  customerDocIds: string[];
  respondedAt: string | null;
  closedAt: string | null;
}

interface OrderVerification {
  checkDocumentsOk: boolean;
  checkDriverIdOk: boolean;
  checkVehicleOk: boolean;
  checkPaymentOk: boolean;
  upgradedToPriority: boolean;
  internalNote: string | null;
  verifiedAt: string | null;
}

interface TimelineEvent {
  id: string;
  actor: string;
  event: string;
  note: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderId: string;
  status: string;
  queueType: string | null;
  departureDate: string | null;
  destination: string;
  vehiclePlateNumber: string | null;
  vehicleMakeModel: string | null;
  transportType: string;
  driverFullName: string;
  driverNationalId: string;
  driverPhone: string;
  driverLicense: string | null;
  cargoDescription: string | null;
  cargoWeightTonnes: number | null;
  cargoType: string | null;
  paymentMethod: string;
  baseFeeAzn: number;
  cargoFeeAzn: number;
  queueSurchargeAzn: number;
  totalAmountAzn: number;
  createdAt: string;
  user: { id: string; email: string; phone: string };
  payments: Payment[];
  verification: OrderVerification | null;
  clarificationRounds: ClarificationRound[];
  documents: { id: string; type: string; originalFileName: string; s3Key: string }[];
  timeline: TimelineEvent[];
}

export default function FinanceOrderDetailPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const t = useTranslations('staffOrders');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [checkDocumentsOk, setCheckDocumentsOk] = useState(false);
  const [checkDriverIdOk, setCheckDriverIdOk] = useState(false);
  const [checkVehicleOk, setCheckVehicleOk] = useState(false);
  const [overrideQueueType, setOverrideQueueType] = useState<string>('');
  const [internalNote, setInternalNote] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [clarifyNote, setClarifyNote] = useState('');
  const [clarifying, setClarifying] = useState(false);
  const [showClarifyForm, setShowClarifyForm] = useState(false);

  const loadOrder = () => {
    apiClient
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrder(); }, [orderId]);

  const payment = order?.payments[0];
  const canConfirm = order?.status === 'PENDING_PAYMENT' && order?.paymentMethod !== 'CARD'
    && (!payment || payment.status === 'PENDING');

  // Initiate payment if it doesn't exist yet, then confirm
  const handleConfirm = async () => {
    if (!order) return;
    setConfirming(true);
    setActionMsg(null);
    try {
      let paymentId = payment?.id;
      if (!paymentId) {
        const res = await apiClient.post<{ data: { id: string } }>('/payment/initiate', {
          orderId: order.orderId,
          method: order.paymentMethod,
          amountAzn: order.totalAmountAzn,
          idempotencyKey: `staff-${order.orderId}`,
        });
        paymentId = res.data.data.id;
      }
      await apiClient.post(`/payment/${paymentId}/confirm`);
      setActionMsg({ type: 'success', text: t('confirmSuccess') });
      loadOrder();
    } catch {
      setActionMsg({ type: 'error', text: t('confirmFailed') });
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !order) return;
    // Initiate payment first if needed so we have a record to reject
    let payId = payment?.id;
    if (!payId) {
      try {
        const res = await apiClient.post<{ data: { id: string } }>('/payment/initiate', {
          orderId: order.orderId,
          method: order.paymentMethod,
          amountAzn: order.totalAmountAzn,
          idempotencyKey: `staff-${order.orderId}`,
        });
        payId = res.data.data.id;
      } catch {
        setActionMsg({ type: 'error', text: t('rejectFailed') });
        return;
      }
    }
    if (!payId) return;
    setRejecting(true);
    setActionMsg(null);
    try {
      await apiClient.post(`/payment/${payId}/reject`, { reason: rejectReason });
      setActionMsg({ type: 'success', text: t('rejectSuccess') });
      setShowRejectForm(false);
      setRejectReason('');
      loadOrder();
    } catch {
      setActionMsg({ type: 'error', text: t('rejectFailed') });
    } finally {
      setRejecting(false);
    }
  };

  const handleVerify = async () => {
    if (!order) return;
    setVerifying(true);
    setActionMsg(null);
    try {
      const effectiveQueue = overrideQueueType || order.queueType || undefined;
      await apiClient.post(`/orders/${order.orderId}/verify`, {
        checkDocumentsOk,
        checkDriverIdOk,
        checkVehicleOk,
        queueType: overrideQueueType && overrideQueueType !== order.queueType ? overrideQueueType : undefined,
        upgradedToPriority: effectiveQueue === 'PRIORITY',
        internalNote: internalNote.trim() || undefined,
      });
      setActionMsg({ type: 'success', text: t('verifySuccess') });
      loadOrder();
    } catch {
      setActionMsg({ type: 'error', text: t('verifyFailed') });
    } finally {
      setVerifying(false);
    }
  };

  const handleClarify = async () => {
    if (!order || !clarifyNote.trim()) return;
    setClarifying(true);
    setActionMsg(null);
    try {
      await apiClient.post(`/orders/${order.orderId}/clarify`, { requestNote: clarifyNote.trim() });
      setActionMsg({ type: 'success', text: t('clarifySuccess') });
      setClarifyNote('');
      setShowClarifyForm(false);
      loadOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionMsg({ type: 'error', text: msg ?? t('clarifyFailed') });
    } finally {
      setClarifying(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-red-600 text-sm">{error ?? 'Order not found'}</p>
    </div>
  );

  const row = (label: string, value: string | null | undefined) => value ? (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/finance/orders`)} className="text-sm text-gray-500 hover:text-gray-700">
          {t('backBtn')}
        </button>
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderId}</h1>
      </div>

      {actionMsg && (
        <div className={`p-3 rounded-xl text-sm ${actionMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Payment Action Panel — shown only when non-card payment awaits confirmation */}
      {canConfirm && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <p className="font-semibold text-amber-800 text-sm">
            This order requires payment confirmation ({order.paymentMethod.replace(/_/g, ' ')})
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {confirming ? '…' : t('confirmBtn')}
            </button>
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg border border-red-200 transition-colors"
            >
              {t('rejectBtn')}
            </button>
          </div>
          {showRejectForm && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600">{t('rejectReason')}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder={t('rejectReasonPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {rejecting ? '…' : t('rejectBtn')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Approval Panel — shown when AWAITING_APPROVAL (pre-payment finance review) */}
      {order.status === 'AWAITING_APPROVAL' && (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-5">
          <p className="font-semibold text-blue-800 text-sm">{t('approveTitle')}</p>

          <div className="space-y-2">
            {([
              { key: 'checkDocuments', value: checkDocumentsOk, setter: setCheckDocumentsOk },
              { key: 'checkDriverId', value: checkDriverIdOk, setter: setCheckDriverIdOk },
              { key: 'checkVehicle', value: checkVehicleOk, setter: setCheckVehicleOk },
            ] as const).map(({ key, value, setter }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setter(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t(key)}
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">{t('queueTypeOverride')}</label>
            <select
              value={overrideQueueType || order.queueType || ''}
              onChange={(e) => setOverrideQueueType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="REGULAR">Regular</option>
              <option value="FAST_TRACK">Fast Track</option>
              <option value="PRIORITY">Priority</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{t('queueTypeOverrideHint')}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">{t('internalNote')}</label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              placeholder={t('internalNotePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleVerify}
              disabled={verifying || !checkDocumentsOk || !checkDriverIdOk || !checkVehicleOk}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {verifying ? '…' : t('approveBtn')}
            </button>
            <button
              onClick={() => setShowClarifyForm(!showClarifyForm)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
            >
              {t('clarifyTitle')}
            </button>
          </div>

          {showClarifyForm && (
            <div className="space-y-2 pt-2 border-t border-blue-100">
              {order.clarificationRounds.length >= 2 ? (
                <p className="text-xs text-red-600">{t('clarifyMaxRounds')}</p>
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-600">{t('clarifyNote')}</label>
                  <textarea
                    value={clarifyNote}
                    onChange={(e) => setClarifyNote(e.target.value)}
                    rows={3}
                    placeholder={t('clarifyNotePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <button
                    onClick={handleClarify}
                    disabled={clarifying || !clarifyNote.trim()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {clarifying ? '…' : t('clarifyBtn')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clarification Status Panel — shown when AWAITING_CLARIFICATION */}
      {order.status === 'AWAITING_CLARIFICATION' && order.clarificationRounds.length > 0 && (() => {
        const openRound = order.clarificationRounds[order.clarificationRounds.length - 1];
        return (
          <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
            <p className="font-semibold text-orange-800 text-sm">
              {t('clarifyRoundLabel', { num: openRound.roundNumber })}
            </p>
            <div className="text-sm text-gray-700">
              <span className="font-medium text-gray-500 text-xs block mb-1">{t('clarifyNote')}</span>
              {openRound.requestNote}
            </div>
            <p className="text-xs text-gray-400">
              {t('clarifyRequestedAt', { date: new Date(openRound.requestedAt).toLocaleString() })}
            </p>
            {openRound.respondedAt ? (
              <div className="space-y-1 pt-2 border-t border-orange-100">
                <p className="text-xs font-medium text-gray-500">{t('clarifyCustomerResponse')}</p>
                {openRound.customerNote && (
                  <p className="text-sm text-gray-700">{openRound.customerNote}</p>
                )}
                <p className="text-xs text-gray-400">
                  {t('clarifyRespondedAt', { date: new Date(openRound.respondedAt).toLocaleString() })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-orange-600 italic">{t('clarifyAwaitingResponse')}</p>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Customer */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('customerInfo')}</h2>
          {row('Email', order.user.email)}
          {row('Phone', order.user.phone)}
        </div>

        {/* Driver */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('driverInfo')}</h2>
          {row('Name', order.driverFullName)}
          {row('National ID', order.driverNationalId)}
          {row('Phone', order.driverPhone)}
          {row('License', order.driverLicense)}
        </div>

        {/* Vehicle */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('vehicleInfo')}</h2>
          {row('Plate', order.vehiclePlateNumber)}
          {row('Type', order.transportType.replace(/_/g, ' '))}
          {row('Make/Model', order.vehicleMakeModel)}
          {row('Queue', order.queueType?.replace(/_/g, ' ') ?? null)}
        </div>

        {/* Transfer */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('transferSection')}</h2>
          {row('Destination', order.destination)}
          {row(t('departureDate'), order.departureDate ? new Date(order.departureDate).toLocaleDateString() : null)}
          {row(t('arrivalDate'), order.departureDate
            ? (d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).toLocaleString())(new Date(order.departureDate))
            : null)}
        </div>

        {/* Cargo */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('cargoInfo')}</h2>
          {row('Description', order.cargoDescription)}
          {row('Weight', order.cargoWeightTonnes ? `${order.cargoWeightTonnes} tonnes` : null)}
          {row('Type', order.cargoType?.replace(/_/g, ' ') ?? null)}
        </div>

        {/* Fees */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('feeBreakdown')}</h2>
          {row(t('baseFee'), `${Number(order.baseFeeAzn).toFixed(2)} AZN`)}
          {row(t('queueSurcharge'), `${Number(order.queueSurchargeAzn).toFixed(2)} AZN`)}
          {row(t('cargoFee'), `${Number(order.cargoFeeAzn).toFixed(2)} AZN`)}
          <div className="flex gap-2 text-sm border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-500 w-40 shrink-0 font-semibold">{t('total')}</span>
            <span className="text-gray-900 font-bold">{Number(order.totalAmountAzn).toFixed(2)} AZN</span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('paymentInfo')}</h2>
          {row(t('paymentMethod'), order.paymentMethod.replace(/_/g, ' '))}
          {payment && row(t('paymentStatus'), payment.status.replace(/_/g, ' '))}
          {payment?.cashReferenceCode && row(t('cashRef'), payment.cashReferenceCode)}
          {payment?.confirmedAt && row('Confirmed at', new Date(payment.confirmedAt).toLocaleString())}
          {payment?.failureReason && row('Rejection reason', payment.failureReason)}
        </div>
      </div>

      {/* Documents */}
      {order.documents && order.documents.length > 0 && (() => {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001') + '/api/v1/files/';
        const groups: Record<string, typeof order.documents> = {
          'Vehicle Documents': order.documents.filter((d) => ['VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE'].includes(d.type)),
          'Driver Documents': order.documents.filter((d) => ['DRIVER_LICENSE', 'PASSPORT', 'NATIONAL_ID'].includes(d.type)),
          'Cargo Documents': order.documents.filter((d) => ['CMR', 'CARGO_DECLARATION'].includes(d.type)),
          'Other Documents': order.documents.filter((d) => !['VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE', 'DRIVER_LICENSE', 'PASSPORT', 'NATIONAL_ID', 'CMR', 'CARGO_DECLARATION'].includes(d.type)),
        };
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Documents</h2>
            {Object.entries(groups).map(([groupName, docs]) => docs.length === 0 ? null : (
              <div key={groupName}>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">{groupName}</p>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">{doc.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-800">{doc.originalFileName}</p>
                      </div>
                      <a
                        href={`${API_BASE}${doc.s3Key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 bg-pob-blue text-white hover:bg-pob-blue-light rounded-md transition-colors whitespace-nowrap"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Order History</h2>
          <ol className="relative border-l border-gray-200 ml-2 space-y-5">
            {order.timeline.map((ev) => (
              <li key={ev.id} className="ml-4">
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-pob-blue border-2 border-white" />
                <p className="text-sm font-medium text-gray-800">{ev.event.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium">{ev.actor}</span>
                  {' · '}
                  {new Date(ev.createdAt).toLocaleString()}
                </p>
                {ev.note && <p className="text-xs text-gray-500 mt-1 italic">{ev.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
