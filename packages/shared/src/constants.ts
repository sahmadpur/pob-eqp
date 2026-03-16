// ─── Queue Defaults ───────────────────────────────────────────────────────────
export const QUEUE_DEFAULTS = {
  PRIORITY_PERCENT: 10,
  FAST_TRACK_PERCENT: 10,
  REGULAR_PERCENT: 80,
  DEFAULT_DAILY_QUOTA: 1000,
} as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  REMEMBER_ME_EXPIRY: '30d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  RATE_LIMIT_PER_HOUR: 10,
  BCRYPT_COST: 12,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 48,
  OTP_EXPIRY_MINUTES: 10,
  OTP_RESEND_COOLDOWN_MINUTES: 2,
} as const;

// ─── Slot Reservation ─────────────────────────────────────────────────────────
export const SLOT_RESERVATION = {
  HOLD_MINUTES: 15,
  PAYMENT_TIMEOUT_MINUTES: 60,
} as const;

// ─── No-Show ──────────────────────────────────────────────────────────────────
export const NO_SHOW = {
  DEFAULT_TIMER_MINUTES: 30,
  DAILY_PENALTY_TRIGGER: true,
} as const;

// ─── Files ────────────────────────────────────────────────────────────────────
export const FILE_LIMITS = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024,     // 10 MB
  DRIVER_LICENSE_MAX_BYTES: 5 * 1024 * 1024, // 5 MB
  PROFILE_PHOTO_MAX_BYTES: 5 * 1024 * 1024,
  MAX_ADDITIONAL_DOCS: 5,
  ACCEPTED_DOC_MIMES: ['application/pdf', 'image/jpeg', 'image/png'],
  ACCEPTED_IMAGE_MIMES: ['image/jpeg', 'image/png'],
} as const;

// ─── Order ────────────────────────────────────────────────────────────────────
export const ORDER_CONSTANTS = {
  ID_PREFIX: 'POB-ORD-',
  RETENTION_YEARS: 7,
  FINANCE_REVIEW_SLA_BUSINESS_DAYS: 3,
  CLARIFICATION_MAX_CYCLES: 2,
} as const;

// ─── Weather thresholds (defaults, configurable by Admin) ────────────────────
export const WEATHER_THRESHOLDS = {
  WIND_SPEED_MS: 20,           // > 20 m/s → block
  PRECIPITATION_MM: 20,        // > 20 mm → warn
  WAVE_HEIGHT_M: 2,            // > 2 m → block
  POLL_INTERVAL_MINUTES: 30,
} as const;

// ─── Finance ─────────────────────────────────────────────────────────────────
export const FINANCE_CONSTANTS = {
  REFUND_TIMEOUT_BUSINESS_DAYS: 5,
  BANK_TRANSFER_TIMEOUT_HOURS: 24,
  CASH_REFERENCE_EXPIRY_HOURS: 24,
} as const;

// ─── Vessel / Manifest ────────────────────────────────────────────────────────
export const VESSEL_CONSTANTS = {
  ETA_NOTIFICATION_HOURS: 5,
  MANIFEST_DISTRIBUTION_MAX_SECONDS: 120,
  ETA_WEBHOOK_MAX_PROCESSING_SECONDS: 30,
} as const;

// ─── Supported locales ────────────────────────────────────────────────────────
export const SUPPORTED_LOCALES = ['az', 'en', 'ru', 'tr'] as const;
export const DEFAULT_LOCALE = 'en';

// ─── ANPR ─────────────────────────────────────────────────────────────────────
export const ANPR_CONSTANTS = {
  MAX_RESPONSE_SECONDS: 2,
  HARDWARE_FAILURE_ALERT_SECONDS: 10,
  MANUAL_OVERRIDE_LOG_REQUIRED: true,
} as const;
