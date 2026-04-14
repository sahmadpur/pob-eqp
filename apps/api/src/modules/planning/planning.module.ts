import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { WeatherService } from './weather.service';

@Module({
  controllers: [PlanningController],
  providers: [PlanningService, WeatherService],
  exports: [PlanningService, WeatherService],
})
export class PlanningModule {}
