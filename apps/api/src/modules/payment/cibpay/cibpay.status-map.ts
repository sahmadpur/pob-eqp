import { PaymentStatus } from '@pob-eqp/shared';
import { CibpayStatus } from './cibpay.types';

export function mapCibpayStatus(status: CibpayStatus | string): PaymentStatus {
  switch (status) {
    case 'charged':
    case 'credited':
      return PaymentStatus.CONFIRMED;
    case 'refunded':
    case 'reversed':
      return PaymentStatus.REFUNDED;
    case 'rejected':
    case 'fraud':
    case 'declined':
    case 'chargedback':
    case 'error':
      return PaymentStatus.FAILED;
    case 'new':
    case 'prepared':
    case 'authorized':
    default:
      return PaymentStatus.PENDING;
  }
}

export function isTerminalCibpayStatus(status: CibpayStatus | string): boolean {
  const terminals: string[] = [
    'charged',
    'credited',
    'refunded',
    'reversed',
    'rejected',
    'fraud',
    'declined',
    'chargedback',
    'error',
  ];
  return terminals.includes(status);
}
