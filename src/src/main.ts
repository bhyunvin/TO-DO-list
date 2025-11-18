import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  app.enableCors({
    origin: ['http://localhost:5173'],
    methods: 'GET,POST,PATCH,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3001);
};

bootstrap();
