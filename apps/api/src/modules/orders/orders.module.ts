import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { QrService } from './qr.service';
import { OrderNotificationsService } from './order-notifications.service';
import { DocumentService } from '../registration/document.service';

@Module({
  imports: [ConfigModule],
  controllers: [OrdersController],
  providers: [OrdersService, QrService, DocumentService, OrderNotificationsService],
  exports: [OrdersService],
})
export class OrdersModule {}
