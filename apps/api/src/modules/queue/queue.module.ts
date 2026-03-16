import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'queue-management' }),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
