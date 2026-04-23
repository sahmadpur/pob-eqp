'use client';

import { useTranslations } from 'next-intl';

interface OrderDocument {
  id: string;
  type?: string;
  documentType?: string;
  originalFileName?: string | null;
  s3Key?: string | null;
}

interface OrderPayment {
  id: string;
  method: string;
  status: string;
  amountAzn?: number | string;
  cashReferenceCode?: string | null;
}

export interface OrderSummary {
  orderId: string;
  status: string;
  driverFullName: string;
  driverNationalId?: string | null;
  driverPhone?: string | null;
  driverLicense?: string | null;
  transportType?: string | null;
  vehiclePlateNumber?: string | null;
  vehicleMakeModel?: string | null;
  cargoType?: string | null;
  cargoWeightTonnes?: number | string | null;
  cargoDescription?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  baseFeeAzn?: number | string | null;
  queueSurchargeAzn?: number | string | null;
  cargoFeeAzn?: number | string | null;
  totalAmountAzn?: number | string | null;
  createdAt?: string | null;
  user?: { email?: string | null; phone?: string | null } | null;
  planQueueType?: { name?: string } | null;
  queueType?: string | null;
  documents?: OrderDocument[];
  payments?: OrderPayment[];
  parkingBayId?: string | null;
}

interface Props {
  order: OrderSummary;
  showDocuments?: boolean;
}

const STATUS_BADGES: Record<string, string> = {
  AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
  AWAITING_CLARIFICATION: 'bg-orange-100 text-orange-800',
  PENDING_PAYMENT: 'bg-blue-100 text-blue-800',
  AWAITING_VERIFICATION: 'bg-indigo-100 text-indigo-800',
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  IN_SHIPMENT: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? 'http://localhost:3001');

function fmtAzn(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return null;
  return `${n.toFixed(2)} AZN`;
}

function fmtDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function arrivalDate(departure: string | null | undefined): string | null {
  if (!departure) return null;
  const d = new Date(departure);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return a.toLocaleDateString();
}

export default function OrderSummaryCard({ order, showDocuments = true }: Props) {
  const tOps = useTranslations('operations');
  const tDet = useTranslations('orderDetail');
  const statusClass = STATUS_BADGES[order.status] ?? 'bg-gray-100 text-gray-700';
  const payment = order.payments?.[0] ?? null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{tOps('orderId')}</p>
          <p className="font-mono font-semibold text-gray-900">{order.orderId}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusClass}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title={tDet('driverSection')}>
          <Row label={tDet('driverName')} value={order.driverFullName} />
          <Row label={tDet('driverNationalId')} value={order.driverNationalId} />
          <Row label={tDet('driverPhone')} value={order.driverPhone} />
          <Row label={tDet('driverLicense')} value={order.driverLicense} />
        </Section>

        <Section title={tDet('vehicleSection')}>
          <Row label={tDet('plate')} value={order.vehiclePlateNumber} />
          <Row label={tDet('vehicleType')} value={order.transportType?.replace(/_/g, ' ')} />
          <Row label={tDet('makeModel')} value={order.vehicleMakeModel} />
        </Section>

        <Section title={tDet('transferSection')}>
          <Row label={tDet('destination')} value={order.destination} />
          <Row label={tDet('departureDate')} value={fmtDate(order.departureDate)} />
          <Row label={tDet('arrivalDate')} value={arrivalDate(order.departureDate)} />
          <Row label={tOps('orderQueueType')} value={order.planQueueType?.name ?? order.queueType} />
        </Section>

        {(order.cargoType || order.cargoWeightTonnes || order.cargoDescription) && (
          <Section title={tDet('cargoSection')}>
            <Row label={tDet('cargoType')} value={order.cargoType?.replace(/_/g, ' ')} />
            <Row
              label={tDet('cargoWeight')}
              value={order.cargoWeightTonnes ? `${Number(order.cargoWeightTonnes)} tonnes` : null}
            />
            <Row label={tDet('cargoDesc')} value={order.cargoDescription} />
          </Section>
        )}

        <Section title={tDet('feesSection')}>
          <Row label={tDet('baseFee')} value={fmtAzn(order.baseFeeAzn)} />
          <Row label={tDet('queueSurcharge')} value={fmtAzn(order.queueSurchargeAzn)} />
          <Row label={tDet('cargoFee')} value={fmtAzn(order.cargoFeeAzn)} />
          <Row label={tDet('total')} value={fmtAzn(order.totalAmountAzn)} bold />
        </Section>

        {(payment || order.paymentMethod) && (
          <Section title={tDet('paymentSection')}>
            <Row label={tDet('paymentMethod')} value={(payment?.method ?? order.paymentMethod)?.replace(/_/g, ' ')} />
            <Row label={tDet('paymentStatus')} value={(payment?.status ?? order.paymentStatus)?.replace(/_/g, ' ')} />
            {payment?.cashReferenceCode && <Row label={tDet('cashRef')} value={payment.cashReferenceCode} />}
          </Section>
        )}

        <Section title={tOps('orderCustomer')}>
          <Row label="Email" value={order.user?.email} />
          <Row label={tDet('driverPhone')} value={order.user?.phone} />
        </Section>
      </div>

      {showDocuments && order.documents && order.documents.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{tOps('orderDocuments')}</p>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {order.documents.map((doc) => {
              const docType = doc.type ?? doc.documentType ?? 'DOCUMENT';
              return (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-2 px-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      {docType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-gray-800 truncate">{doc.originalFileName ?? '—'}</p>
                  </div>
                  {doc.s3Key && (
                    <a
                      href={`${API_BASE}/api/v1/files/${doc.s3Key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                    >
                      View
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-1.5">
      <h3 className="font-semibold text-gray-800 text-sm mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 w-32 shrink-0">{label}</span>
      <span className={`text-gray-900 ${bold ? 'font-bold' : 'font-medium'} break-words`}>{value}</span>
    </div>
  );
}
