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

const DESTINATIONS = [
  'Kuryk, Kazakhstan',
  'Turkmenbashi, Turkmenistan',
] as const;

const schema = z.object({
  queueType:          z.enum(['PRIORITY', 'FAST_TRACK', 'REGULAR']),
  scheduledDate:      z.string().min(1, 'Select a date'),
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
  documents: { id: string; type: string; originalFileName: string }[];
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
  const [docFiles, setDocFiles] = useState<DocFiles>({});
  const [existingDocs, setExistingDocs] = useState<OrderDetail['documents']>([]);
  const [fees, setFees] = useState({ base: 50, cargo: 0, queue: 0, total: 50 });

  const QUEUE_OPTIONS = [
    { value: 'REGULAR',    label: tNew('queueRegular'),    desc: tNew('queueRegularDesc'),    color: 'border-gray-300'  },
    { value: 'FAST_TRACK', label: tNew('queueFastTrack'), desc: tNew('queueFastTrackDesc'),  color: 'border-blue-400'  },
    { value: 'PRIORITY',   label: tNew('queuePriority'),  desc: tNew('queuePriorityDesc'),   color: 'border-amber-400' },
  ];

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
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
  const cargoWeightKg = watch('cargoWeightKg');

  useEffect(() => {
    const base = 50;
    const cargo = cargoWeightKg ? +((cargoWeightKg / 1000) * 0.05).toFixed(2) : 0;
    const queue = selectedQueue === 'PRIORITY' ? 30 : selectedQueue === 'FAST_TRACK' ? 15 : 0;
    setFees({ base, cargo, queue, total: base + cargo + queue });
  }, [selectedQueue, cargoWeightKg]);

  useEffect(() => {
    apiClient
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => {
        const o = res.data.data;
        if (o.status !== 'PENDING_PAYMENT') { setLocked(true); return; }
        setExistingDocs(o.documents ?? []);
        const scheduledDate = o.scheduledDate
          ? new Date(o.scheduledDate).toISOString().split('T')[0]
          : '';
        // Map destination: if it doesn't match known values, default to first
        const dest = DESTINATIONS.includes(o.destination as typeof DESTINATIONS[number])
          ? (o.destination as typeof DESTINATIONS[number])
          : DESTINATIONS[0];
        // Map cargoType to dropdown values
        const ct = (['GENERAL', 'HAZARDOUS', 'PERISHABLE'] as const).includes(o.cargoType as 'GENERAL' | 'HAZARDOUS' | 'PERISHABLE')
          ? (o.cargoType as 'GENERAL' | 'HAZARDOUS' | 'PERISHABLE')
          : 'GENERAL';
        reset({
          queueType:          (o.queueType as FormData['queueType']) ?? 'REGULAR',
          scheduledDate,
          destination:        dest,
          vehiclePlateNumber: o.vehiclePlateNumber ?? '',
          transportType:      (o.transportType as FormData['transportType']) ?? 'TRANSPORT_WITH_CARGO',
          vehicleMakeModel:   o.vehicleMakeModel ?? '',
          driverFullName:     o.driverFullName,
          driverNationalId:   o.driverNationalId,
          driverPhone:        o.driverPhone,
          driverLicense:      o.driverLicense ?? '',
          cargoDescription:   o.cargoDescription ?? '',
          cargoWeightKg:      o.cargoWeightTonnes ? +(o.cargoWeightTonnes * 1000) : 0,
          cargoType:          ct,
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
      const res = await apiClient.get<{ data: { covered: boolean } }>(`/planning/check-date?date=${date}`);
      if (!res.data.data.covered) setDateError(tNew('noActivePlan'));
    } catch {
      // let server validate
    } finally {
      setCheckingDate(false);
    }
  };

  const setFile = (key: keyof DocFiles, file: File | undefined) => {
    setDocFiles((prev) => ({ ...prev, [key]: file }));
  };

  const uploadNewDocs = async () => {
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
        cargoType:          data.cargoType,
        paymentMethod:      data.paymentMethod,
      });
      await uploadNewDocs();
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

  const fileInput = (label: string, key: keyof DocFiles, required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <label className="flex items-center gap-2 cursor-pointer group">
        <span className={`flex-1 px-3 py-2 border rounded-lg text-sm truncate ${docFiles[key] ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-400'}`}>
          {docFiles[key] ? docFiles[key]!.name : 'Choose file (PDF, JPG, PNG)'}
        </span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => setFile(key, e.target.files?.[0])} />
        <span className="px-3 py-2 bg-gray-100 group-hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap">
          Browse
        </span>
      </label>
    </div>
  );

  const existingDocsByCategory = (types: string[]) =>
    existingDocs.filter((d) => types.includes(d.type));

  const ExistingDocsBadge = ({ types }: { types: string[] }) => {
    const docs = existingDocsByCategory(types);
    if (!docs.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {docs.map((d) => (
          <span key={d.id} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
            {d.type.replace(/_/g, ' ')} — {d.originalFileName}
          </span>
        ))}
      </div>
    );
  };

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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tNew('destination')} *</label>
              <select {...register('destination')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
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
          {field(`${tNew('makeModel')} *`, 'vehicleMakeModel', 'text', 'e.g. Volvo FH16')}
        </div>

        {/* Vehicle Documents */}
        {transportType !== 'DRIVER_ONLY' && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Vehicle Documents</h3>
              <ExistingDocsBadge types={['VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE']} />
              <p className="text-xs text-gray-500 mt-1">Upload new documents to replace or supplement existing ones</p>
            </div>
            {fileInput('Vehicle Registration Certificate', 'VEHICLE_REGISTRATION')}
            {fileInput('Vehicle Insurance', 'VEHICLE_INSURANCE')}
          </div>
        )}

        {/* Driver */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{tNew('driverSection')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {field(tNew('driverFullName'), 'driverFullName', 'text', 'First and last name')}
            {field(tNew('driverNationalId'), 'driverNationalId', 'text', 'ID or passport number')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field(tNew('driverPhone'), 'driverPhone', 'tel', '+994501234567')}
            {field(`${tNew('driverLicense')} *`, 'driverLicense', 'text', 'e.g. AZ123456')}
          </div>
        </div>

        {/* Driver Documents */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Driver Documents</h3>
            <ExistingDocsBadge types={['DRIVER_LICENSE', 'PASSPORT']} />
            <p className="text-xs text-gray-500 mt-1">Upload new documents to supplement existing ones</p>
          </div>
          {fileInput("Driver's License", 'DRIVER_LICENSE')}
          {fileInput('Passport', 'PASSPORT')}
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
          <div className="grid grid-cols-2 gap-3">
            {field(tNew('cargoWeight'), 'cargoWeightKg', 'number')}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cargo Type</label>
              <select {...register('cargoType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pob-blue">
                <option value="GENERAL">General</option>
                <option value="PERISHABLE">Perishable</option>
                <option value="HAZARDOUS">Hazardous</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cargo Documents */}
        {transportType === 'TRANSPORT_WITH_CARGO' && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Cargo Documents</h3>
              <ExistingDocsBadge types={['CMR', 'CARGO_DECLARATION']} />
              <p className="text-xs text-gray-500 mt-1">Upload new cargo documents</p>
            </div>
            {fileInput('CMR Waybill', 'CMR')}
            {fileInput('Cargo Declaration', 'CARGO_DECLARATION')}
          </div>
        )}

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
