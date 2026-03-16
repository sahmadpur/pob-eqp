'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';

const schema = z.object({
  // Queue & schedule
  queueType:        z.enum(['PRIORITY', 'FAST_TRACK', 'REGULAR']),
  scheduledDate:    z.string().min(1, 'Select a date'),
  destination:      z.string().min(2, 'Destination required').max(200),

  // Vehicle
  vehiclePlateNumber: z.string().min(2, 'Vehicle plate required').max(20),
  transportType:      z.enum(['DRIVER_ONLY', 'TRANSPORT', 'TRANSPORT_WITH_CARGO']),
  vehicleMakeModel:   z.string().max(100).optional(),

  // Driver
  driverFullName:   z.string().min(3, 'Full name required').max(200),
  driverNationalId: z.string().min(4, 'National ID required').max(30),
  driverPhone:      z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164 format e.g. +994501234567'),
  driverLicense:    z.string().max(30).optional(),

  // Cargo
  cargoDescription: z.string().min(3, 'Describe the cargo').max(500),
  cargoWeightKg:    z.coerce.number().min(1, 'Weight required').max(1000000),
  isHazardous:      z.boolean().default(false),

  // Payment
  paymentMethod:    z.enum(['BANK_TRANSFER', 'CASH']),
});

type FormData = z.infer<typeof schema>;

const QUEUE_OPTIONS = [
  { value: 'REGULAR',    label: 'Regular',    desc: '80% of daily slots',         color: 'border-gray-300'  },
  { value: 'FAST_TRACK', label: 'Fast Track', desc: '10% of slots — faster',      color: 'border-blue-400'  },
  { value: 'PRIORITY',   label: 'Priority',   desc: '10% of slots — first served', color: 'border-amber-400' },
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const minDate = tomorrow.toISOString().split('T')[0];

export default function NewOrderPage() {
  const locale = useLocale();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { queueType: 'REGULAR', isHazardous: false, transportType: 'TRANSPORT_WITH_CARGO', paymentMethod: 'BANK_TRANSFER' },
  });

  const selectedQueue = watch('queueType');
  const isHazardous = watch('isHazardous');

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setApiError(null);
    try {
      await apiClient.post('/orders', {
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
      setApiError(e.response?.data?.message ?? 'Failed to create order. Please try again.');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">New Shipment Order</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details to reserve your queue slot.</p>
      </div>

      {apiError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{apiError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Queue Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Queue Type</label>
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
          <h3 className="font-semibold text-gray-800 text-sm">Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" min={minDate} {...register('scheduledDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue" />
              {errors.scheduledDate && <p className="text-red-500 text-xs mt-1">{errors.scheduledDate.message}</p>}
            </div>
            {field('Destination / Port Terminal', 'destination', 'text', 'e.g. Terminal 3, Baku')}
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Vehicle</h3>
          <div className="grid grid-cols-2 gap-3">
            {field('Plate Number', 'vehiclePlateNumber', 'text', 'e.g. 10-AA-123')}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
              <select {...register('transportType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                <option value="TRANSPORT_WITH_CARGO">Transport with Cargo</option>
                <option value="TRANSPORT">Transport (no cargo)</option>
                <option value="DRIVER_ONLY">Driver Only</option>
              </select>
            </div>
          </div>
          {field('Make / Model (optional)', 'vehicleMakeModel', 'text', 'e.g. Volvo FH16')}
        </div>

        {/* Driver */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Driver</h3>
          <div className="grid grid-cols-2 gap-3">
            {field('Full Name', 'driverFullName', 'text', 'First and last name')}
            {field('National ID', 'driverNationalId', 'text', 'ID or passport number')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Phone', 'driverPhone', 'tel', '+994501234567')}
            {field('License Number (optional)', 'driverLicense')}
          </div>
        </div>

        {/* Cargo */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Cargo</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea {...register('cargoDescription')} rows={2} placeholder="Describe the cargo contents"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue resize-none" />
            {errors.cargoDescription && <p className="text-red-500 text-xs mt-1">{errors.cargoDescription.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 items-center">
            {field('Weight (kg)', 'cargoWeightKg', 'number')}
            <div className="pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isHazardous}
                  onChange={(e) => setValue('isHazardous', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pob-blue focus:ring-pob-blue" />
                <span className="text-sm text-gray-700">Hazardous cargo</span>
              </label>
              {isHazardous && <p className="text-xs text-amber-600 mt-1">Assigned to Zone C parking</p>}
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {(['BANK_TRANSFER', 'CASH'] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => setValue('paymentMethod', m)}
                className={`p-3 border-2 rounded-xl text-left transition-all ${watch('paymentMethod') === m ? 'border-pob-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-semibold text-sm text-gray-800">
                  {m === 'BANK_TRANSFER' ? '🏦 Bank Transfer' : '💵 Cash'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full py-3 bg-pob-blue text-white font-semibold rounded-xl hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {submitting ? 'Creating Order...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
