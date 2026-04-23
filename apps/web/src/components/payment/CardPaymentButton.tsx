'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Props {
  orderId: string;
  amountAzn: number;
  locale: string;
  existingPaymentUrl?: string | null;
  label?: string;
}

export function CardPaymentButton({ orderId, amountAzn, locale, existingPaymentUrl, label }: Props) {
  const t = useTranslations('payment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      if (existingPaymentUrl) {
        window.location.href = existingPaymentUrl;
        return;
      }
      const res = await apiClient.post<{
        data: {
          id: string;
          paymentUrl?: string | null;
          status: string;
          method: string;
        };
      }>('/payment/initiate', {
        orderId,
        method: 'CARD',
        amountAzn,
        idempotencyKey: `card-${orderId}-${Date.now()}`,
        locale,
      });
      const paymentUrl = res.data?.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        setError(t('noPaymentUrl'));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('initiateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full px-4 py-2.5 bg-pob-blue hover:bg-pob-blue-light text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
      >
        {loading ? t('redirecting') : (label ?? t('payWithCard'))}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
