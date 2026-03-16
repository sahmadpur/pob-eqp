import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { PlanningModule } from './modules/planning/planning.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { QueueModule } from './modules/queue/queue.module';
import { ParkingModule } from './modules/parking/parking.module';
import { ShipmentModule } from './modules/shipment/shipment.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import awsConfig from './config/aws.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, awsConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting (BRD: 10 req/hour/IP for login) ─────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        name: 'default',
        ttl: config.get('THROTTLE_TTL_MS', 60000),
        limit: config.get('THROTTLE_LIMIT', 100),
      }]),
    }),

    // ── Task Scheduling (no-show timers, cascade jobs, weather polls) ──────
    ScheduleModule.forRoot(),

    // ── Event Emitter (domain events between modules) ──────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),

    // ── Bull Job Queues (Redis-backed) ────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
    }),

    // ── Core ──────────────────────────────────────────────────────────────
    PrismaModule,

    // ── Feature Modules ───────────────────────────────────────────────────
    AuthModule,
    RegistrationModule,
    PlanningModule,
    OrdersModule,
    PaymentModule,
    QueueModule,
    ParkingModule,
    ShipmentModule,
    NotificationsModule,
    ReportingModule,
    SupportModule,
    AdminModule,
  ],
})
export class AppModule {}
