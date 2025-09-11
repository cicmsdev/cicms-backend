import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static images from src/images folder
  app.useStaticAssets(join(__dirname, '..', 'src', 'images'), {
    prefix: '/images/',
  });

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe (requires class-transformer & class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true, 
      transformOptions: {
        enableImplicitConversion: true, 
      },
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
