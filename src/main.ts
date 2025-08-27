import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static images from src/images folder
  app.useStaticAssets(join(__dirname, '..', 'src', 'images'), {
    prefix: '/images/',
  });
  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
