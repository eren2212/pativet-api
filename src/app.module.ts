import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./prisma.module.js";
import { AuthModule } from './auth/auth.module.js';
import { PetsModule } from './pets/pets.module.js';
import { ClinicsModule } from './clinics/clinics.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { ProfileModule } from './profile/profile.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PetsModule, ConfigModule.forRoot(), ClinicsModule, ScheduleModule.forRoot(), ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
