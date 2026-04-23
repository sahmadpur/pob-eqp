import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CibpayService } from './cibpay/cibpay.service';
import { CibpayConfigService } from './cibpay/cibpay.config';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, CibpayService, CibpayConfigService],
  exports: [PaymentService, CibpayService],
})
export class PaymentModule {}
