'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { formatCountdown } from '@/lib/utils';
import { SLOT_RESERVATION } from '@pob-eqp/shared';
import { cn } from '@/lib/utils';

interface SlotReservationTimerProps {
  onExpire?: () => void;
  className?: string;
}

/**
 * 15-minute slot reservation countdown timer.
 * Must be visible on all order-creation steps (BRD requirement).
 */
export function SlotReservationTimer({ onExpire, className }: SlotReservationTimerProps) {
  const totalSeconds = SLOT_RESERVATION.HOLD_MINUTES * 60;
  const { seconds } = useCountdown({
    initialSeconds: totalSeconds,
    onExpire,
  });

  const isWarning = seconds <= 120; // last 2 minutes
  const isCritical = seconds <= 60; // last 1 minute

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold',
        isCritical
          ? 'bg-red-100 text-red-700 border border-red-200'
          : isWarning
            ? 'bg-amber-100 text-amber-700 border border-amber-200'
            : 'bg-blue-100 text-pob-blue border border-blue-200',
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Slot reservation expires in ${formatCountdown(seconds)}`}
    >
      <span className="text-base">⏱</span>
      <span>{formatCountdown(seconds)}</span>
    </div>
  );
}
