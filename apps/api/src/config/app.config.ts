import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  throttleTtlMs: parseInt(process.env.THROTTLE_TTL_MS || '60000', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  noShowTimerMinutes: parseInt(process.env.NO_SHOW_TIMER_MINUTES || '30', 10),
  slotReservationMinutes: parseInt(process.env.SLOT_RESERVATION_MINUTES || '15', 10),
  paymentTimeoutMinutes: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '60', 10),
  maxFileUploadMb: parseInt(process.env.MAX_FILE_UPLOAD_MB || '10', 10),
  financeReviewSlaDays: parseInt(process.env.FINANCE_REVIEW_SLA_DAYS || '3', 10),
  weatherWindThresholdMs: parseFloat(process.env.WEATHER_WIND_THRESHOLD_MS || '20'),
  weatherWaveThresholdM: parseFloat(process.env.WEATHER_WAVE_THRESHOLD_M || '2'),
  weatherPrecipThresholdMm: parseFloat(process.env.WEATHER_PRECIP_THRESHOLD_MM || '20'),
}));
