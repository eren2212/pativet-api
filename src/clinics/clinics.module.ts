import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service.js';
import { ClinicsController } from './clinics.controller.js';

@Module({
  providers: [ClinicsService],
  controllers: [ClinicsController]
})
export class ClinicsModule { }
