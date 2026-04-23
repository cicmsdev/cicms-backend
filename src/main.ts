// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Prefix ALL HTTP routes with /api
  app.setGlobalPrefix('api');

  // Static images
  app.useStaticAssets(join(process.cwd(), 'public', 'images'), { prefix: '/images/' });

  // CORS (API + Socket.IO)
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });



  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Turn off etag if you want (fine to keep)
  app.set('etag', false);

  const port = Number(process.env.PORT ?? 5000);
  await app.listen(port);
  console.log(`HTTP  listening at http://localhost:${port}/api`);
  console.log(`WS    base at     http://localhost:${port}`);
}
bootstrap();
