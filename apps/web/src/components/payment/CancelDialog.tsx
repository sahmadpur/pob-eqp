'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Props {
  paymentId: string;
  onClose: () => void;
  onDone: () => void;
}

export function CancelDialog({ paymentId, onClose, onDone }: Props) {
  const t = useTranslations('payment');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/payment/${paymentId}/cancel`, {
        reason: reason.trim() || undefined,
      });
      onDone();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t('cancelFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">{t('cancelPayment')}</h3>
        <p className="text-sm text-gray-600">{t('confirmCancel')}</p>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">{t('refundReason')}</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {t('close')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
          >
            {submitting ? '…' : t('confirmCancelBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
