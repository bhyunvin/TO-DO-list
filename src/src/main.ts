import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

import { Logger } from '@nestjs/common';

const bootstrap = async () => {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  const origins = ['http://localhost:5173'];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  logger.log(`Current NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`Configured CORS Origins: ${JSON.stringify(origins)}`);

  app.enableCors({
    origin: origins,
    methods: 'GET,POST,PATCH,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
};

bootstrap();
