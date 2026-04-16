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
  scheduledDate: string | null;
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
  timeline: TimelineEvent[];
}

export default function AdminOrderDetailPage() {
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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div>
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/admin/orders`)} className="text-sm text-gray-500 hover:text-gray-700">
          {t('backBtn')}
        </button>
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderId}</h1>
      </div>

      {actionMsg && (
        <div className={`p-3 rounded-xl text-sm ${actionMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Payment Action Panel */}
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
          {row('Destination', order.destination)}
          {row('Scheduled', order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : null)}
          {row('Queue', order.queueType?.replace(/_/g, ' ') ?? null)}
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
