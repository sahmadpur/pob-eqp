'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';

const schema = z.object({
  vehicleNumber:   z.string().min(2, 'Vehicle number required').max(20),
  vehicleType:     z.enum(['TRUCK', 'SEMI_TRUCK', 'TANKER', 'CONTAINER', 'OTHER']),
  driverFirstName: z.string().min(2, 'Required'),
  driverLastName:  z.string().min(2, 'Required'),
  driverLicenseNo: z.string().min(4, 'Required'),
  cargoDescription:z.string().min(3, 'Describe the cargo').max(500),
  cargoWeightKg:   z.coerce.number().min(1, 'Weight required').max(100000),
  isHazardous:     z.boolean().default(false),
  queueType:       z.enum(['PRIORITY', 'FAST_TRACK', 'REGULAR']),
  scheduledDate:   z.string().min(1, 'Select a date'),
});

type FormData = z.infer<typeof schema>;

const QUEUE_OPTIONS = [
  { value: 'REGULAR',    label: 'Regular',    desc: '80% of daily slots — standard queue',       color: 'border-gray-300' },
  { value: 'FAST_TRACK', label: 'Fast Track', desc: '10% of daily slots — reduced waiting time', color: 'border-blue-400' },
  { value: 'PRIORITY',   label: 'Priority',   desc: '10% of daily slots — first served',         color: 'border-amber-400' },
];

// Minimum date = tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const minDate = tomorrow.toISOString().split('T')[0];

export default function NewOrderPage() {
  const locale = useLocale();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { queueType: 'REGULAR', isHazardous: false, vehicleType: 'TRUCK' },
  });

  const selectedQueue = watch('queueType');
  const isHazardous = watch('isHazardous');

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setApiError(null);
    try {
      await apiClient.post('/orders', {
        ...data,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
      });
      router.push(`/${locale}/customer/orders`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Shipment Order</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details to reserve your queue slot.</p>
      </div>

      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{apiError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Queue Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Queue Type</label>
          <div className="grid grid-cols-3 gap-3">
            {QUEUE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('queueType', opt.value as FormData['queueType'])}
                className={`p-3 border-2 rounded-xl text-left transition-all ${
                  selectedQueue === opt.value
                    ? `${opt.color} bg-blue-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
          {errors.queueType && <p className="text-red-500 text-xs mt-1">{errors.queueType.message}</p>}
        </div>

        {/* Scheduled Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
          <input
            type="date"
            min={minDate}
            {...register('scheduledDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
          />
          {errors.scheduledDate && <p className="text-red-500 text-xs mt-1">{errors.scheduledDate.message}</p>}
        </div>

        {/* Vehicle */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Vehicle Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Number</label>
              <input
                {...register('vehicleNumber')}
                placeholder="e.g. 10-AA-123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
              />
              {errors.vehicleNumber && <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
              <select
                {...register('vehicleType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
              >
                <option value="TRUCK">Truck</option>
                <option value="SEMI_TRUCK">Semi-Truck</option>
                <option value="TANKER">Tanker</option>
                <option value="CONTAINER">Container</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Driver */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Driver Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input
                {...register('driverFirstName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
              />
              {errors.driverFirstName && <p className="text-red-500 text-xs mt-1">{errors.driverFirstName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input
                {...register('driverLastName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
              />
              {errors.driverLastName && <p className="text-red-500 text-xs mt-1">{errors.driverLastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Driver License Number</label>
            <input
              {...register('driverLicenseNo')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
            />
            {errors.driverLicenseNo && <p className="text-red-500 text-xs mt-1">{errors.driverLicenseNo.message}</p>}
          </div>
        </div>

        {/* Cargo */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Cargo Details</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cargo Description</label>
            <textarea
              {...register('cargoDescription')}
              rows={2}
              placeholder="Describe the cargo contents"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue resize-none"
            />
            {errors.cargoDescription && <p className="text-red-500 text-xs mt-1">{errors.cargoDescription.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
              <input
                type="number"
                {...register('cargoWeightKg')}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue"
              />
              {errors.cargoWeightKg && <p className="text-red-500 text-xs mt-1">{errors.cargoWeightKg.message}</p>}
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHazardous}
                  onChange={(e) => setValue('isHazardous', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pob-blue focus:ring-pob-blue"
                />
                <span className="text-sm text-gray-700">Hazardous cargo</span>
              </label>
              {isHazardous && (
                <p className="text-xs text-amber-600 mt-1">Will be assigned to Zone C parking</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-pob-blue text-white font-semibold rounded-xl hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating Order...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
