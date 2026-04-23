'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

type SyncState = 'syncing' | 'confirmed' | 'failed' | 'pending' | 'error';

const TERMINAL: SyncState[] = ['confirmed', 'failed'];

export default function PaymentReturnPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const t = useTranslations('payment');

  const [state, setState] = useState<SyncState>('syncing');
  const [attempts, setAttempts] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    let currentAttempt = 0;
    const MAX_ATTEMPTS = 6;
    const DELAY_MS = 2000;

    const tick = async () => {
      if (stopped.current) return;
      currentAttempt += 1;
      setAttempts(currentAttempt);
      try {
        const paymentRes = await apiClient.get<{
          data: {
            id: string;
            status: string;
            cibpayStatus: string | null;
          } | null;
        }>(`/payment/order/${orderId}`);
        const payment = paymentRes.data?.data;

        if (!payment) {
          setState('error');
          return;
        }

        const syncRes = await apiClient.post<{
          data: {
            status: string;
            cibpayStatus: string | null;
          };
        }>(`/payment/${payment.id}/sync`, {});
        const synced = syncRes.data?.data;

        if (synced?.status === 'CONFIRMED') {
          setState('confirmed');
          return;
        }
        if (synced?.status === 'FAILED') {
          setState('failed');
          return;
        }
        if (currentAttempt >= MAX_ATTEMPTS) {
          setState('pending');
          return;
        }
        setTimeout(tick, DELAY_MS);
      } catch {
        if (currentAttempt >= MAX_ATTEMPTS) {
          setState('error');
          return;
        }
        setTimeout(tick, DELAY_MS);
      }
    };

    tick();
    return () => {
      stopped.current = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!TERMINAL.includes(state)) return;
    const timeout = setTimeout(() => {
      router.push(`/${locale}/customer/orders/${orderId}`);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [state, locale, orderId, router]);

  const iconFor = () => {
    if (state === 'confirmed') return <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">✓</div>;
    if (state === 'failed') return <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">✕</div>;
    if (state === 'error' || state === 'pending') return <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 text-2xl">!</div>;
    return <div className="w-10 h-10 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />;
  };

  const title = () => {
    if (state === 'confirmed') return t('paymentSuccess');
    if (state === 'failed') return t('paymentFailed');
    if (state === 'pending') return t('paymentPending');
    if (state === 'error') return t('paymentSyncError');
    return t('syncing');
  };

  const subtitle = () => {
    if (state === 'confirmed') return t('redirectingToOrder');
    if (state === 'failed') return t('redirectingToOrder');
    if (state === 'pending') return t('stillPending');
    if (state === 'error') return t('tryOpeningOrder');
    return `${t('attempt')} ${attempts}`;
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <div className="flex justify-center">{iconFor()}</div>
        <h1 className="text-lg font-semibold text-gray-900">{title()}</h1>
        <p className="text-sm text-gray-500">{subtitle()}</p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/customer/orders/${orderId}`)}
          className="text-xs text-pob-blue hover:underline"
        >
          {t('goToOrder')}
        </button>
      </div>
    </div>
  );
}
