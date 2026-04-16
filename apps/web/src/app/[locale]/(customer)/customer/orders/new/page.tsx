'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@pob-eqp/shared';

const DESTINATIONS = [
  'Kuryk, Kazakhstan',
  'Turkmenbashi, Turkmenistan',
] as const;

const schema = z.object({
  queueType:          z.enum(['PRIORITY', 'FAST_TRACK', 'REGULAR']),
  departureDate:      z.string().min(1, 'Select a date'),
  destination:        z.enum(['Kuryk, Kazakhstan', 'Turkmenbashi, Turkmenistan']),
  vehiclePlateNumber: z.string().min(2, 'Vehicle plate required').max(20),
  transportType:      z.enum(['DRIVER_ONLY', 'TRANSPORT', 'TRANSPORT_WITH_CARGO']),
  vehicleMakeModel:   z.string().min(1, 'Make & model required').max(100),
  driverFullName:     z.string().min(3, 'Full name required').max(200),
  driverNationalId:   z.string().min(4, 'National ID required').max(30),
  driverPhone:        z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164 format e.g. +994501234567'),
  driverLicense:      z.string().min(2, 'Driver license number required').max(30),
  cargoDescription:   z.string().min(3, 'Describe the cargo').max(500),
  cargoWeightKg:      z.coerce.number().min(1, 'Weight required').max(1000000),
  cargoType:          z.enum(['GENERAL', 'HAZARDOUS', 'PERISHABLE']).default('GENERAL'),
  paymentMethod:      z.enum(['BANK_TRANSFER', 'CASH', 'CARD']),
});

type FormData = z.infer<typeof schema>;

interface DocFiles {
  VEHICLE_REGISTRATION?: File;
  VEHICLE_INSURANCE?: File;
  DRIVER_LICENSE?: File;
  PASSPORT?: File;
  CMR?: File;
  CARGO_DECLARATION?: File;
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const minDate = tomorrow.toISOString().split('T')[0];

export default function NewOrderPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('newOrder');
  const { user } = useAuthStore();
  const isLegal = user?.role === UserRole.CUSTOMER_LEGAL;

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [checkingDate, setCheckingDate] = useState(false);
  const [docFiles, setDocFiles] = useState<DocFiles>({});
  const [docErrors, setDocErrors] = useState<string | null>(null);

  const QUEUE_OPTIONS = [
    { value: 'REGULAR',    label: t('queueRegular'),    desc: t('queueRegularDesc'),    color: 'border-gray-300'  },
    { value: 'FAST_TRACK', label: t('queueFastTrack'), desc: t('queueFastTrackDesc'),  color: 'border-blue-400'  },
    { value: 'PRIORITY',   label: t('queuePriority'),  desc: t('queuePriorityDesc'),   color: 'border-amber-400' },
  ];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      queueType: 'REGULAR',
      cargoType: 'GENERAL',
      transportType: 'TRANSPORT_WITH_CARGO',
      paymentMethod: 'CASH',
      destination: 'Kuryk, Kazakhstan',
    },
  });

  const selectedQueue = watch('queueType');
  const transportType = watch('transportType');

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setValue('departureDate', date);
    if (!date) { setDateError(null); return; }
    setCheckingDate(true);
    setDateError(null);
    try {
      const res = await apiClient.get<{ data: { covered: boolean } }>(`/planning/check-date?date=${date}`);
      if (!res.data.data.covered) setDateError(t('noActivePlan'));
    } catch {
      // let server validate
    } finally {
      setCheckingDate(false);
    }
  };

  const setFile = (key: keyof DocFiles, file: File | undefined) => {
    setDocFiles((prev) => ({ ...prev, [key]: file }));
    setDocErrors(null);
  };

  const uploadDocs = async (orderDbId: string, orderId: string) => {
    const entries: [keyof DocFiles, string][] = [
      ['VEHICLE_REGISTRATION', 'VEHICLE_REGISTRATION'],
      ['VEHICLE_INSURANCE', 'VEHICLE_INSURANCE'],
      ['DRIVER_LICENSE', 'DRIVER_LICENSE'],
      ['PASSPORT', 'PASSPORT'],
      ['CMR', 'CMR'],
      ['CARGO_DECLARATION', 'CARGO_DECLARATION'],
    ];
    for (const [key, docType] of entries) {
      const file = docFiles[key];
      if (!file) continue;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', docType);
      await apiClient.post(`/orders/${orderId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    // Validate required documents
    if (!docFiles.DRIVER_LICENSE) { setDocErrors(t('errorDriverLicense')); return; }
    if (!docFiles.PASSPORT) { setDocErrors(t('errorPassport')); return; }
    if (transportType !== 'DRIVER_ONLY') {
      if (!docFiles.VEHICLE_REGISTRATION) { setDocErrors(t('errorVehicleRegistration')); return; }
      if (!docFiles.VEHICLE_INSURANCE) { setDocErrors(t('errorVehicleInsurance')); return; }
    }
    if (transportType === 'TRANSPORT_WITH_CARGO') {
      if (!docFiles.CMR) { setDocErrors(t('errorCmr')); return; }
      if (!docFiles.CARGO_DECLARATION) { setDocErrors(t('errorCargoDeclaration')); return; }
    }

    setSubmitting(true);
    setApiError(null);
    try {
      const res = await apiClient.post<{ data: { id: string; orderId: string } }>('/orders', {
        destination:        data.destination,
        queueType:          data.queueType,
        departureDate:      new Date(data.departureDate).toISOString(),
        vehiclePlateNumber: data.vehiclePlateNumber,
        transportType:      data.transportType,
        vehicleMakeModel:   data.vehicleMakeModel,
        driverFullName:     data.driverFullName,
        driverNationalId:   data.driverNationalId,
        driverPhone:        data.driverPhone,
        driverLicense:      data.driverLicense,
        cargoDescription:   data.cargoDescription,
        cargoWeightTonnes:  +(data.cargoWeightKg / 1000).toFixed(3),
        cargoType:          data.cargoType,
        paymentMethod:      data.paymentMethod,
      });
      await uploadDocs(res.data.data.id, res.data.data.orderId);
      router.push(`/${locale}/customer/orders`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? t('failedToCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, name: keyof FormData, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}<span className="text-red-500 ml-0.5">*</span></label>
      <input type={type} placeholder={placeholder} {...register(name as never)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue" />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message as string}</p>}
    </div>
  );

  const fileInput = (label: string, key: keyof DocFiles, required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <label className="flex items-center gap-2 cursor-pointer group">
        <span className={`flex-1 px-3 py-2 border rounded-lg text-sm truncate ${docFiles[key] ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-400'}`}>
          {docFiles[key] ? docFiles[key]!.name : t('chooseFile')}
        </span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => setFile(key, e.target.files?.[0])} />
        <span className="px-3 py-2 bg-gray-100 group-hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap">
          {t('browse')}
        </span>
      </label>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">{t('backBtn')}</button>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Queue Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('queueType')}</label>
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
          <h3 className="font-semibold text-gray-800 text-sm">{t('scheduleSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('date')}<span className="text-red-500 ml-0.5">*</span></label>
              <input type="date" min={minDate} {...register('departureDate')}
                onChange={handleDateChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue ${dateError ? 'border-red-400' : 'border-gray-300'}`} />
              {checkingDate && <p className="text-gray-400 text-xs mt-1">{t('checkingDate')}</p>}
              {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
              {errors.departureDate && !dateError && <p className="text-red-500 text-xs mt-1">{errors.departureDate.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('destination')}<span className="text-red-500 ml-0.5">*</span></label>
              <select {...register('destination')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination.message}</p>}
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{t('vehicleSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {field(t('plateNumber'), 'vehiclePlateNumber', 'text', t('plateNumberPlaceholder'))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('vehicleType')}<span className="text-red-500 ml-0.5">*</span></label>
              <select {...register('transportType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                <option value="TRANSPORT_WITH_CARGO">{t('transportWithCargo')}</option>
                <option value="TRANSPORT">{t('transportNoCargo')}</option>
                <option value="DRIVER_ONLY">{t('driverOnly')}</option>
              </select>
            </div>
          </div>
          {field(t('makeModel'), 'vehicleMakeModel', 'text', t('makeModelPlaceholder'))}
        </div>

        {/* Vehicle Documents */}
        {transportType !== 'DRIVER_ONLY' && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{t('vehicleDocsSection')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('vehicleDocsNote')}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {fileInput(t('vehicleRegistrationDoc'), 'VEHICLE_REGISTRATION', true)}
              {fileInput(t('vehicleInsuranceDoc'), 'VEHICLE_INSURANCE', true)}
            </div>
          </div>
        )}

        {/* Driver */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{t('driverSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {field(t('driverFullName'), 'driverFullName', 'text', t('driverFullNamePlaceholder'))}
            {field(t('driverNationalId'), 'driverNationalId', 'text', t('driverNationalIdPlaceholder'))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field(t('driverPhone'), 'driverPhone', 'tel', '+994501234567')}
            {field(t('driverLicense'), 'driverLicense', 'text', t('driverLicensePlaceholder'))}
          </div>
        </div>

        {/* Driver Documents */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{t('driverDocsSection')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('driverDocsNote')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {fileInput(t('driverLicenseDoc'), 'DRIVER_LICENSE', true)}
            {fileInput(t('passportDoc'), 'PASSPORT', true)}
          </div>
        </div>

        {/* Cargo */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{t('cargoSection')}</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('cargoDescription')}<span className="text-red-500 ml-0.5">*</span></label>
            <textarea {...register('cargoDescription')} rows={2} placeholder={t('cargoDescriptionPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue resize-none" />
            {errors.cargoDescription && <p className="text-red-500 text-xs mt-1">{errors.cargoDescription.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field(t('cargoWeight'), 'cargoWeightKg', 'number')}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('cargoType')}<span className="text-red-500 ml-0.5">*</span></label>
              <select {...register('cargoType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                <option value="GENERAL">{t('cargoTypeGeneral')}</option>
                <option value="PERISHABLE">{t('cargoTypePerishable')}</option>
                <option value="HAZARDOUS">{t('cargoTypeHazardous')}</option>
              </select>
              {errors.cargoType && <p className="text-red-500 text-xs mt-1">{errors.cargoType.message}</p>}
            </div>
          </div>
        </div>

        {/* Cargo Documents */}
        {transportType === 'TRANSPORT_WITH_CARGO' && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{t('cargoDocsSection')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('cargoDocsNote')}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {fileInput(t('cmrWaybill'), 'CMR', true)}
              {fileInput(t('cargoDeclarationDoc'), 'CARGO_DECLARATION', true)}
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{t('paymentSection')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['BANK_TRANSFER', 'CASH', 'CARD'] as const)
              .filter((m) => m !== 'BANK_TRANSFER' || isLegal)
              .map((m) => (
              <button key={m} type="button"
                onClick={() => setValue('paymentMethod', m)}
                className={`p-3 border-2 rounded-xl text-left transition-all ${watch('paymentMethod') === m ? 'border-pob-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-semibold text-sm text-gray-800">
                  {m === 'BANK_TRANSFER' ? `🏦 ${t('bankTransfer')}` : m === 'CASH' ? `💵 ${t('cash')}` : `💳 ${t('card')}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {apiError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{apiError}</div>}
        {docErrors && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{docErrors}</div>}

        <button type="submit" disabled={submitting || !!dateError || checkingDate}
          className="w-full py-3 bg-pob-blue text-white font-semibold rounded-xl hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {submitting ? t('creating') : t('createBtn')}
        </button>
      </form>
    </div>
  );
}
