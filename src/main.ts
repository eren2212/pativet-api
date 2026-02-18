import { NestFactory } from '@nestjs/core';
import { AppModule } from "./app.module.js";
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    // 👇 İŞTE BU AYAR "TRUE" OLMALI KANKA
    transform: true,
    transformOptions: {
      enableImplicitConversion: true, // Bu da ekstra kolaylık sağlar
    },
  }));

  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
