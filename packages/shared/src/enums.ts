// ─── User & Auth ────────────────────────────────────────────────────────────

export enum UserRole {
  CUSTOMER_INDIVIDUAL = 'CUSTOMER_INDIVIDUAL',
  CUSTOMER_LEGAL = 'CUSTOMER_LEGAL',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  CONTROL_TOWER_OPERATOR = 'CONTROL_TOWER_OPERATOR',
  GATE_OFFICER = 'GATE_OFFICER',
  PARKING_CHECKER = 'PARKING_CHECKER',
  BORDER_OFFICER = 'BORDER_OFFICER',
  TERMINAL_OPERATOR = 'TERMINAL_OPERATOR',
  SYSTEM_ADMINISTRATOR = 'SYSTEM_ADMINISTRATOR',
}

export enum AccountStatus {
  PENDING_EMAIL = 'PENDING_EMAIL',       // awaiting email verification
  PENDING_REVIEW = 'PENDING_REVIEW',     // legal entity awaiting Finance review
  PENDING_CONTRACT = 'PENDING_CONTRACT', // contract sent, awaiting e-sign
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
  DECLINED = 'DECLINED',
}

// ─── Registration ────────────────────────────────────────────────────────────

export enum RegistrationStatus {
  SUBMITTED = 'SUBMITTED',
  DOCUMENTS_REQUESTED = 'DOCUMENTS_REQUESTED',
  AWAITING_SIGNATURE = 'AWAITING_SIGNATURE',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

// ─── Planning ────────────────────────────────────────────────────────────────

export enum PlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum DayStatus {
  WORKING = 'WORKING',
  NON_WORKING = 'NON_WORKING',
  WEATHER_BLOCKED = 'WEATHER_BLOCKED',
  HOLIDAY = 'HOLIDAY',
}

// ─── Queue Types (base — additional custom types stored in DB) ────────────────

export enum BaseQueueType {
  PRIORITY = 'PRIORITY',
  FAST_TRACK = 'FAST_TRACK',
  REGULAR = 'REGULAR',
}

// ─── Order ────────────────────────────────────────────────────────────────────

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  AWAITING_VERIFICATION = 'AWAITING_VERIFICATION',
  AWAITING_CLARIFICATION = 'AWAITING_CLARIFICATION',
  VERIFIED = 'VERIFIED',
  IN_SHIPMENT = 'IN_SHIPMENT',
  BORDER_PASSED = 'BORDER_PASSED',
  AT_TERMINAL = 'AT_TERMINAL',
  LOADED = 'LOADED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum TransportType {
  DRIVER_ONLY = 'DRIVER_ONLY',
  TRANSPORT = 'TRANSPORT',
  TRANSPORT_WITH_CARGO = 'TRANSPORT_WITH_CARGO',
}

export enum CargoType {
  GENERAL = 'GENERAL',
  BULK = 'BULK',
  REFRIGERATED = 'REFRIGERATED',
  HAZARDOUS = 'HAZARDOUS',
  OVERSIZED = 'OVERSIZED',
  PERISHABLE = 'PERISHABLE',
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export enum PaymentMethod {
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  AWAITING_BANK_TRANSFER = 'AWAITING_BANK_TRANSFER',
  CASH_AT_GATE = 'CASH_AT_GATE',
}

// ─── Vessel & Manifest ────────────────────────────────────────────────────────

export enum VesselStatus {
  EXPECTED = 'EXPECTED',
  APPROVED = 'APPROVED',
  POSTPONED = 'POSTPONED',
  ARRIVED = 'ARRIVED',
  DEPARTED = 'DEPARTED',
}

export enum ManifestStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',       // immutable after this state
  DISTRIBUTED = 'DISTRIBUTED',
}

// ─── Parking ─────────────────────────────────────────────────────────────────

export enum ParkingZoneType {
  REGULAR = 'REGULAR',
  HAZARDOUS_PRIORITY = 'HAZARDOUS_PRIORITY',
  FAST_TRACK = 'FAST_TRACK',
  OVERSIZED = 'OVERSIZED',
}

export enum ParkingSlotStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
}

export enum TruckArrivalStatus {
  EXPECTED = 'EXPECTED',
  ARRIVED = 'ARRIVED',
  LINED_UP = 'LINED_UP',
  NO_SHOW = 'NO_SHOW',
  ABSENT = 'ABSENT',
}

// ─── Loading Status ───────────────────────────────────────────────────────────

export enum LoadingStatus {
  EXPECTED = 'EXPECTED',
  ARRIVED = 'ARRIVED',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  FINISHED = 'FINISHED',
}

// ─── Fine / Penalty ───────────────────────────────────────────────────────────

export enum FineType {
  NO_SHOW = 'NO_SHOW',
  WRONG_PARKING = 'WRONG_PARKING',
  LATE_ARRIVAL = 'LATE_ARRIVAL',
}

export enum FineStatus {
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  WAIVED = 'WAIVED',
  DISPUTED = 'DISPUTED',
}

// ─── Notifications ────────────────────────────────────────────────────────────

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationCategory {
  ORDERS = 'ORDERS',
  PAYMENTS = 'PAYMENTS',
  REGISTRATION = 'REGISTRATION',
  SHIPMENT = 'SHIPMENT',
  SYSTEM = 'SYSTEM',
}

// ─── Support ─────────────────────────────────────────────────────────────────

export enum SupportTicketCategory {
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  GATE_ENTRY_FAILURE = 'GATE_ENTRY_FAILURE',
  DOCUMENT_PROBLEM = 'DOCUMENT_PROBLEM',
  PARKING_DISPUTE = 'PARKING_DISPUTE',
  TECHNICAL_ERROR = 'TECHNICAL_ERROR',
  ANPR_FAILURE = 'ANPR_FAILURE',
  OTHER = 'OTHER',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// ─── Documents ───────────────────────────────────────────────────────────────

export enum DocumentType {
  NATIONAL_ID = 'NATIONAL_ID',
  PASSPORT = 'PASSPORT',
  COMPANY_CERTIFICATE = 'COMPANY_CERTIFICATE',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  DIRECTOR_ID = 'DIRECTOR_ID',
  POWER_OF_ATTORNEY = 'POWER_OF_ATTORNEY',
  CMR = 'CMR',
  CARGO_DECLARATION = 'CARGO_DECLARATION',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
  VEHICLE_REGISTRATION = 'VEHICLE_REGISTRATION',
  VEHICLE_INSURANCE = 'VEHICLE_INSURANCE',
  ADDITIONAL = 'ADDITIONAL',
  CONTRACT = 'CONTRACT',
  MANIFEST = 'MANIFEST',
}

// ─── Locale ───────────────────────────────────────────────────────────────────

export enum SupportedLocale {
  AZ = 'az',
  EN = 'en',
  RU = 'ru',
  TR = 'tr',
}
