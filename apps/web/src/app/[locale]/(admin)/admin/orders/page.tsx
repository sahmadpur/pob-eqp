'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Payment {
  id: string;
  method: string;
  status: string;
  amountAzn: number;
}

interface OrderUser {
  email: string;
  phone: string;
}

interface Order {
  id: string;
  orderId: string;
  status: string;
  queueType: string | null;
  createdAt: string;
  scheduledDate: string | null;
  paymentMethod: string;
  totalAmountAzn: number;
  user: OrderUser;
  payments: Payment[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  AWAITING_VERIFICATION: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-purple-100 text-purple-700',
  IN_SHIPMENT: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

const PAY_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  AWAITING_BANK_TRANSFER: 'bg-blue-100 text-blue-700',
  CASH_AT_GATE: 'bg-purple-100 text-purple-700',
};

const FILTERS = ['filterAll', 'filterPendingPayment', 'filterAwaitingVerification', 'filterCompleted', 'filterCancelled'] as const;
const FILTER_STATUSES: Record<string, string | undefined> = {
  filterAll: undefined,
  filterPendingPayment: 'PENDING_PAYMENT',
  filterAwaitingVerification: 'AWAITING_VERIFICATION',
  filterCompleted: 'COMPLETED',
  filterCancelled: 'CANCELLED',
};

export default function AdminOrdersPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('staffOrders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]>('filterAll');

  useEffect(() => {
    setLoading(true);
    const status = FILTER_STATUSES[activeFilter];
    const params = status ? `?status=${status}` : '';
    apiClient
      .get<{ data: Order[] }>(`/orders${params}`)
      .then((res) => setOrders(res.data.data ?? []))
      .catch(() => setError(t('failedToLoad')))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === f ? 'bg-pob-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
          >
            {t(f)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {!loading && !error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colOrder')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colCustomer')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colQueueType')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colScheduled')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colPaymentMethod')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colPaymentStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colAmount')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colCreated')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">—</td></tr>
              )}
              {orders.map((order) => {
                const payment = order.payments[0];
                const needsConfirm = order.status === 'PENDING_PAYMENT' && order.paymentMethod !== 'CARD';
                return (
                  <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${needsConfirm ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-medium text-pob-blue">{order.orderId}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{order.user.email}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{order.queueType ? order.queueType.toLowerCase().replace(/_/g, ' ') : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{order.paymentMethod.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      {payment ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAY_STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {payment.status.replace(/_/g, ' ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{Number(order.totalAmountAzn).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/${locale}/admin/orders/${order.orderId}`)}
                        className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                      >
                        {t('viewBtn')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
