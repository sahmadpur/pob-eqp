import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  url: process.env.REDIS_URL,
  slotReservationTtlSec: parseInt(process.env.SLOT_TTL_SEC || '900', 10), // 15 min
}));
