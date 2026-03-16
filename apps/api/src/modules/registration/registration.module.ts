import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { DocumentService } from './document.service';
import { RegistrationNotificationsService } from './registration-notifications.service';

@Module({
  controllers: [RegistrationController],
  providers: [RegistrationService, DocumentService, RegistrationNotificationsService],
  exports: [RegistrationService, DocumentService, RegistrationNotificationsService],
})
export class RegistrationModule {}
