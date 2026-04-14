'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@pob-eqp/shared';

const schema = z.object({
  queueType:          z.enum(['PRIORITY', 'FAST_TRACK', 'REGULAR']),
  scheduledDate:      z.string().min(1, 'Select a date'),
  destination:        z.string().min(2, 'Destination required').max(200),
  vehiclePlateNumber: z.string().min(2, 'Vehicle plate required').max(20),
  transportType:      z.enum(['DRIVER_ONLY', 'TRANSPORT', 'TRANSPORT_WITH_CARGO']),
  vehicleMakeModel:   z.string().max(100).optional(),
  driverFullName:     z.string().min(3, 'Full name required').max(200),
  driverNationalId:   z.string().min(4, 'National ID required').max(30),
  driverPhone:        z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164 format e.g. +994501234567'),
  driverLicense:      z.string().max(30).optional(),
  cargoDescription:   z.string().min(3, 'Describe the cargo').max(500),
  cargoWeightKg:      z.coerce.number().min(1, 'Weight required').max(1000000),
  isHazardous:        z.boolean().default(false),
  paymentMethod:      z.enum(['BANK_TRANSFER', 'CASH', 'CARD']),
});

type FormData = z.infer<typeof schema>;

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
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const minDate = tomorrow.toISOString().split('T')[0];

export default function EditOrderPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const tEdit = useTranslations('editOrder');
  const tNew = useTranslations('newOrder');
  const { user } = useAuthStore();
  const isLegal = user?.role === UserRole.CUSTOMER_LEGAL;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [checkingDate, setCheckingDate] = useState(false);
  // Live fee preview
  const [fees, setFees] = useState({ base: 50, cargo: 0, queue: 0, total: 50 });

  const QUEUE_OPTIONS = [
    { value: 'REGULAR',    label: tNew('queueRegular'),    desc: tNew('queueRegularDesc'),    color: 'border-gray-300'  },
    { value: 'FAST_TRACK', label: tNew('queueFastTrack'), desc: tNew('queueFastTrackDesc'),  color: 'border-blue-400'  },
    { value: 'PRIORITY',   label: tNew('queuePriority'),  desc: tNew('queuePriorityDesc'),   color: 'border-amber-400' },
  ];

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { queueType: 'REGULAR', isHazardous: false, transportType: 'TRANSPORT_WITH_CARGO', paymentMethod: 'CASH' },
  });

  const selectedQueue = watch('queueType');
  const isHazardous = watch('isHazardous');
  const cargoWeightKg = watch('cargoWeightKg');

  // Recalculate fee preview whenever queue or weight changes
  useEffect(() => {
    const base = 50;
    const cargo = cargoWeightKg ? +((cargoWeightKg / 1000) * 0.05).toFixed(2) : 0;
    const queue = selectedQueue === 'PRIORITY' ? 30 : selectedQueue === 'FAST_TRACK' ? 15 : 0;
    setFees({ base, cargo, queue, total: base + cargo + queue });
  }, [selectedQueue, cargoWeightKg]);

  // Load existing order
  useEffect(() => {
    apiClient
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => {
        const o = res.data.data;
        if (o.status !== 'PENDING_PAYMENT') {
          setLocked(true);
          return;
        }
        const scheduledDate = o.scheduledDate
          ? new Date(o.scheduledDate).toISOString().split('T')[0]
          : '';
        reset({
          queueType:          (o.queueType as FormData['queueType']) ?? 'REGULAR',
          scheduledDate,
          destination:        o.destination,
          vehiclePlateNumber: o.vehiclePlateNumber ?? '',
          transportType:      (o.transportType as FormData['transportType']) ?? 'TRANSPORT_WITH_CARGO',
          vehicleMakeModel:   o.vehicleMakeModel ?? '',
          driverFullName:     o.driverFullName,
          driverNationalId:   o.driverNationalId,
          driverPhone:        o.driverPhone,
          driverLicense:      o.driverLicense ?? '',
          cargoDescription:   o.cargoDescription ?? '',
          cargoWeightKg:      o.cargoWeightTonnes ? +(o.cargoWeightTonnes * 1000) : 0,
          isHazardous:        o.cargoType === 'HAZARDOUS',
          paymentMethod:      (o.paymentMethod as FormData['paymentMethod']) ?? 'CASH',
        });
      })
      .catch(() => setLoadError('Failed to load order'));
  }, [orderId, reset]);

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setValue('scheduledDate', date);
    if (!date) { setDateError(null); return; }
    setCheckingDate(true);
    setDateError(null);
    try {
      const res = await apiClient.get<{ data: { covered: boolean } }>(
        `/planning/check-date?date=${date}`,
      );
      if (!res.data.data.covered) setDateError(tNew('noActivePlan'));
    } catch {
      // let server validate
    } finally {
      setCheckingDate(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setApiError(null);
    try {
      await apiClient.patch(`/orders/${orderId}`, {
        destination:        data.destination,
        queueType:          data.queueType,
        scheduledDate:      new Date(data.scheduledDate).toISOString(),
        vehiclePlateNumber: data.vehiclePlateNumber,
        transportType:      data.transportType,
        vehicleMakeModel:   data.vehicleMakeModel,
        driverFullName:     data.driverFullName,
        driverNationalId:   data.driverNationalId,
        driverPhone:        data.driverPhone,
        driverLicense:      data.driverLicense,
        cargoDescription:   data.cargoDescription,
        cargoWeightTonnes:  +(data.cargoWeightKg / 1000).toFixed(3),
        isHazardous:        data.isHazardous,
        paymentMethod:      data.paymentMethod,
      });
      router.push(`/${locale}/customer/orders`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? tEdit('saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, name: keyof FormData, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} placeholder={placeholder} {...register(name as never)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue" />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message as string}</p>}
    </div>
  );

  if (loadError) return (
    <div className="max-w-2xl mx-auto">
      <p className="text-red-600 text-sm">{loadError}</p>
    </div>
  );

  if (locked) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">{tEdit('backBtn')}</button>
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h2 className="font-semibold text-amber-800 text-lg mb-1">{tEdit('lockedTitle')}</h2>
        <p className="text-amber-700 text-sm">{tEdit('lockedDesc')}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">{tEdit('backBtn')}</button>
        <h1 className="text-2xl font-bold text-gray-900">{tEdit('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{tEdit('subtitle')}</p>
      </div>

      {apiError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{apiError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Queue Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{tNew('queueType')}</label>
          <div className="grid grid-cols-3 gap-3">
            {QUEUE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => setValue('queueType', opt.value as FormData['queueType'])}
                className={`p-3 border-2 rounded-xl text-left transition-all ${selectedQueue === opt.value ? `${opt.color} bg-blue-50` : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule & Destination */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{tNew('scheduleSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tNew('date')}</label>
              <input type="date" min={minDate} {...register('scheduledDate')}
                onChange={handleDateChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue ${dateError ? 'border-red-400' : 'border-gray-300'}`} />
              {checkingDate && <p className="text-gray-400 text-xs mt-1">{tNew('checkingDate')}</p>}
              {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
              {errors.scheduledDate && !dateError && <p className="text-red-500 text-xs mt-1">{errors.scheduledDate.message}</p>}
            </div>
            {field(tNew('destination'), 'destination', 'text', 'e.g. Terminal 3, Baku')}
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{tNew('vehicleSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {field(tNew('plateNumber'), 'vehiclePlateNumber', 'text', 'e.g. 10-AA-123')}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tNew('vehicleType')}</label>
              <select {...register('transportType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                <option value="TRANSPORT_WITH_CARGO">{tNew('transportWithCargo')}</option>
                <option value="TRANSPORT">{tNew('transportNoCargo')}</option>
                <option value="DRIVER_ONLY">{tNew('driverOnly')}</option>
              </select>
            </div>
          </div>
          {field(tNew('makeModel'), 'vehicleMakeModel', 'text', 'e.g. Volvo FH16')}
        </div>

        {/* Driver */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{tNew('driverSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {field(tNew('driverFullName'), 'driverFullName', 'text', 'First and last name')}
            {field(tNew('driverNationalId'), 'driverNationalId', 'text', 'ID or passport number')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field(tNew('driverPhone'), 'driverPhone', 'tel', '+994501234567')}
            {field(tNew('driverLicense'), 'driverLicense')}
          </div>
        </div>

        {/* Cargo */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{tNew('cargoSection')}</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{tNew('cargoDescription')}</label>
            <textarea {...register('cargoDescription')} rows={2} placeholder="Describe the cargo contents"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue resize-none" />
            {errors.cargoDescription && <p className="text-red-500 text-xs mt-1">{errors.cargoDescription.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 items-center">
            {field(tNew('cargoWeight'), 'cargoWeightKg', 'number')}
            <div className="pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isHazardous}
                  onChange={(e) => setValue('isHazardous', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pob-blue focus:ring-pob-blue" />
                <span className="text-sm text-gray-700">{tNew('hazardous')}</span>
              </label>
              {isHazardous && <p className="text-xs text-amber-600 mt-1">{tNew('hazardousNote')}</p>}
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{tNew('paymentSection')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['BANK_TRANSFER', 'CASH', 'CARD'] as const)
              .filter((m) => m !== 'BANK_TRANSFER' || isLegal)
              .map((m) => (
              <button key={m} type="button"
                onClick={() => setValue('paymentMethod', m)}
                className={`p-3 border-2 rounded-xl text-left transition-all ${watch('paymentMethod') === m ? 'border-pob-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-semibold text-sm text-gray-800">
                  {m === 'BANK_TRANSFER' ? `🏦 ${tNew('bankTransfer')}` : m === 'CASH' ? `💵 ${tNew('cash')}` : `💳 ${tNew('card')}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fee Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-blue-800 mb-2">Fee Preview</p>
          <div className="space-y-1 text-blue-700">
            <div className="flex justify-between"><span>Base</span><span>{fees.base} AZN</span></div>
            {fees.queue > 0 && <div className="flex justify-between"><span>Queue surcharge</span><span>{fees.queue} AZN</span></div>}
            {fees.cargo > 0 && <div className="flex justify-between"><span>Cargo</span><span>{fees.cargo} AZN</span></div>}
            <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-1"><span>Total</span><span>{fees.total.toFixed(2)} AZN</span></div>
          </div>
        </div>

        <button type="submit" disabled={submitting || !!dateError || checkingDate}
          className="w-full py-3 bg-pob-blue text-white font-semibold rounded-xl hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {submitting ? tEdit('saving') : tEdit('saveBtn')}
        </button>
      </form>
    </div>
  );
}
