'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  queueType: string;
  createdAt: string;
  scheduledDate?: string;
  vehicleNumber?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: Order[] }>('/orders/my')
      .then((res) => setOrders(res.data.data ?? []))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">Track all your shipment orders</p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/customer/orders/new`)}
          className="px-4 py-2 bg-pob-blue text-white text-sm font-medium rounded-lg hover:bg-pob-blue-light transition-colors"
        >
          + New Order
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
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No orders yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first shipment order to get started.</p>
          <button
            onClick={() => router.push(`/${locale}/customer/orders/new`)}
            className="px-6 py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light transition-colors"
          >
            Create Order
          </button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Queue Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-pob-blue">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{order.vehicleNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{order.queueType?.toLowerCase().replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
