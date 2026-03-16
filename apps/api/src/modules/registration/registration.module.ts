import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { DocumentService } from './document.service';
import { RegistrationNotificationsService } from './registration-notifications.service';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService, DocumentService, RegistrationNotificationsService],
  exports: [RegistrationService, DocumentService, RegistrationNotificationsService],
})
export class RegistrationModule {}
