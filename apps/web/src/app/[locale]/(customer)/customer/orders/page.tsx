'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Order {
  id: string;
  orderId: string;
  status: string;
  queueType: string | null;
  createdAt: string;
  departureDate?: string;
  vehiclePlateNumber?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
  AWAITING_VERIFICATION: 'bg-blue-100 text-blue-700',
  QUEUED: 'bg-purple-100 text-purple-700',
  CALLED: 'bg-orange-100 text-orange-700',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

export default function MyOrdersPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadOrders = () => {
    setLoading(true);
    apiClient
      .get<{ data: Order[] }>('/orders/me')
      .then((res) => setOrders(res.data.data ?? []))
      .catch(() => setError(t('failedToLoad')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const handleCancelClick = (orderId: string) => {
    setConfirmingId(orderId);
  };

  const handleCancelConfirm = async (orderId: string) => {
    setCancellingId(orderId);
    setConfirmingId(null);
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      loadOrders();
    } catch {
      setError(t('cancelFailed'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/customer/orders/new`)}
          className="px-4 py-2 bg-pob-blue text-white text-sm font-medium rounded-lg hover:bg-pob-blue-light transition-colors"
        >
          {t('newOrderBtn')}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('noOrdersTitle')}</h3>
          <p className="text-gray-500 text-sm mb-6">{t('noOrdersDesc')}</p>
          <button
            onClick={() => router.push(`/${locale}/customer/orders/new`)}
            className="px-6 py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            {t('createOrderBtn')}
          </button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colOrder')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colVehicle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colQueueType')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colDeparture')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colArrival')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colCreated')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-pob-blue">{order.orderId}</td>
                  <td className="px-4 py-3 text-gray-700">{order.vehiclePlateNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{order.queueType ? order.queueType.toLowerCase().replace(/_/g, ' ') : '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.departureDate ? new Date(order.departureDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.departureDate
                      ? (d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).toLocaleString())(new Date(order.departureDate))
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                      {order.status === 'AWAITING_CLARIFICATION' && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium animate-pulse">
                          Action needed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/${locale}/customer/orders/${order.orderId}`)}
                        className="text-xs px-2.5 py-1 bg-pob-blue text-white hover:bg-pob-blue-light rounded-md transition-colors"
                      >
                        View
                      </button>
                      {order.status === 'PENDING_PAYMENT' && (
                        <>
                          <button
                            onClick={() => router.push(`/${locale}/customer/orders/${order.orderId}/edit`)}
                            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                          >
                            {t('editBtn')}
                          </button>
                          {confirmingId === order.orderId ? (
                            <span className="flex items-center gap-1.5 text-xs text-red-700">
                              {t('cancelConfirm')}
                              <button
                                onClick={() => handleCancelConfirm(order.orderId)}
                                disabled={cancellingId === order.orderId}
                                className="underline font-medium"
                              >
                                {t('cancelBtn')}
                              </button>
                              <button onClick={() => setConfirmingId(null)} className="text-gray-500 underline">✕</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCancelClick(order.orderId)}
                              disabled={cancellingId === order.orderId}
                              className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors disabled:opacity-50"
                            >
                              {cancellingId === order.orderId ? '…' : t('cancelBtn')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
