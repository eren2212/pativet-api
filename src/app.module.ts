import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./prisma.module.js";
import { AuthModule } from './auth/auth.module.js';
import { PetsModule } from './pets/pets.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PetsModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
