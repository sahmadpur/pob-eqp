import {
  UserRole,
  AccountStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  CargoType,
  TransportType,
  BaseQueueType,
  FineType,
  FineStatus,
  NotificationChannel,
  NotificationCategory,
  VesselStatus,
  DocumentType,
} from './enums';

// ─── Common ───────────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;          // userId
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  identifier: string;   // email or phone
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

export interface UserSummary {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  accountStatus: AccountStatus;
  displayName: string;
  profilePhotoUrl?: string;
  locale: string;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export interface IndividualRegistrationRequest {
  firstName: string;
  lastName: string;
  fathersName?: string;
  dateOfBirth: string;         // ISO 8601
  nationalIdOrPassport: string;
  phone: string;               // E.164
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LegalEntityRegistrationRequest {
  companyName: string;
  taxRegistrationId: string;
  legalAddress: string;
  contactPersonName: string;
  contactPersonPosition: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  // documents uploaded separately via S3 presigned URL
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderSummary {
  id: string;
  orderId: string;               // POB-ORD-XXXX
  destination: string;
  shipmentDate: string;
  queueType: BaseQueueType | string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmountAzn: number;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  driverFullName: string;
  driverNationalId: string;
  driverPhone: string;
  transportType: TransportType;
  vehiclePlateNumber?: string;
  vehicleMakeModel?: string;
  cargoType?: CargoType;
  cargoWeightTonnes?: number;
  cargoDescription?: string;
  qrCodeUrl?: string;
  documents: DocumentSummary[];
  timeline: OrderEvent[];
}

export interface OrderEvent {
  id: string;
  timestamp: string;
  actor: string;      // 'Customer' | 'Finance' | 'Platform' | 'Gate' etc.
  event: string;
  note?: string;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface DocumentSummary {
  id: string;
  type: DocumentType;
  fileName: string;
  fileSizeBytes: number;
  s3Key: string;
  uploadedAt: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface PlanSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  defaultDailyQuota: number;
  workingDaysCount: number;
  totalQuota: number;
  ordersAssigned: number;
  createdByName: string;
}

export interface QueueTypeConfig {
  id: string;
  name: string;
  baseType: BaseQueueType | null;  // null for custom types
  quotaSharePercent: number;
  loadingSequence: number;
  dailyCount: number;              // computed: quota * percent / 100
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PriceBreakdown {
  baseFeeAzn: number;
  queueSurchargeAzn: number;
  cargoFeeAzn: number;
  totalAzn: number;
}

// ─── Fine ─────────────────────────────────────────────────────────────────────

export interface FineSummary {
  id: string;
  type: FineType;
  status: FineStatus;
  amountAzn: number;
  issuedAt: string;
  paidAt?: string;
  orderId: string;
  orderDisplayId: string;
}

// ─── Vessel / Manifest ────────────────────────────────────────────────────────

export interface VesselSummary {
  id: string;
  name: string;
  flag?: string;
  eta: string;
  status: VesselStatus;
  priorityCount: number;
  fastTrackCount: number;
  regularCount: number;
  totalCount: number;
}

// ─── Slot Reservation ─────────────────────────────────────────────────────────

export interface SlotReservationResponse {
  reservationId: string;
  expiresAt: string;           // 15 minutes from now
  remainingSeconds: number;
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface WeatherDay {
  date: string;
  windSpeedMs: number;
  precipitationMm: number;
  waveHeightM: number;
  isHighRisk: boolean;
}
