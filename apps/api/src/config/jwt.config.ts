import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiry: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  rememberMeExpiry: process.env.JWT_REMEMBER_ME_EXPIRES_IN || '30d',
}));
